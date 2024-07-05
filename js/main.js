const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const compression = require("compression");
const mysql2 = require("mysql2/promise");
const { ClusterMemoryStoreWorker } = require("@express-rate-limit/cluster-memory-store");
const { slowDown } = require("express-slow-down");

const bodyParser = require("body-parser");

const { Log, TerminalStyle } = require("./lib/util");
const view = require("./view");

const accounts = require("./accounts");

const log = new Log(process.env.WORKER_ID);

const limiter = require("express-rate-limit")({
	store: new ClusterMemoryStoreWorker(),
	windowMs: 1 * 60 * 1000, // 1分
	max: 100, // 100回まで
	standardHeaders: true,
	legacyHeaders: false,
});
const slot = slowDown({
	windowMs: 10 * 60 * 1000, // 10分
	delayAfter: 900, // 900回まで
	delayMs: (hits) => hits * 10,
	maxDelayMs: 2000,
});

// MySQLオプション
const connection = mysql2.createPool({
	host: process.env.MYSQL_HOST,
	port: process.env.MYSQL_PORT,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DB,
	charset: "utf8mb4",
});
const sessionStore = new MySQLStore(
	{
		expiration: 1000 * 60 * 60 * 24 * 7, // 1週間
		clearExpired: true,
		createDatabaseTable: true,
	},
	connection
);

const app = express();

// ##################################################
// ミドルウェア群
// ##################################################
{
	const path = require("node:path");
	const safeExt = new Set([".js", ".css", ".json", ".jpg", ".jpeg", ".png", ".ico", ".svg"]);
	app.use((req, res, next) => {
		if ((res.locals.safeExt = safeExt.has(path.extname(req.originalUrl)))) {
			next();
			return;
		}
		// リクエスト数制限
		limiter(req, res, next);
	});

	function shouldCompress(req, res) {
		if (req.headers["x-no-compression"]) {
			// 圧縮して欲しくないらしいのでしない
			return false;
		}

		// 圧縮する
		return compression.filter(req, res);
	}

	// gzip圧縮
	app.use(
		compression({
			filter: shouldCompress,
		})
	);

	// アクセスURL表示
	const BASE_URL = `http://${process.env.IP}:${process.env.PORT}`;
	app.use((req, res, next) => {
		let color;
		if (res.locals.safeExt) {
			color = TerminalStyle.FG_CYAN;
			if (req.method === "GET") {
				color += TerminalStyle.DIM;
			}
		} else {
			color = TerminalStyle.FG_L_CYAN;
		}
		log.log(`${color}${req.method}: ${BASE_URL}${req.originalUrl}`);
		next();
	});

	// static設定
	app.use(
		express.static("static", {
			maxAge: 60 * 60 * 24 * 7, // 1週間
			index: false,
		})
	);

	// スロットリング
	app.use(slot);

	// post取得設定
	app.use(
		bodyParser.urlencoded({
			extended: true,
		})
	);
	app.use(bodyParser.json());

	// セッション設定
	app.use(
		session({
			store: sessionStore,
			secret: process.env.SESSION_SECRET,
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 7, // 1週間
			},
			resave: false,
			saveUninitialized: false,
		})
	);

	// 表示時に必要な設定系
	app.use((req, res, next) => {
		// セッション
		if (req.session?.accessCou) {
			req.session.accessCou++;
		} else {
			req.session.accessCou = 1;
		}
		res.locals.userid = req.session.userid;
		res.locals.username = req.session.username;
		next();
	});

	// テンプレートエンジン設定
	app.set("view engine", "ejs");
	app.set("views", path.join(__dirname, "../views"));
}

// 起動
const server = app.listen(process.env.PORT, process.env.IP, function () {
	log.debug_log(`Listening to PORT: ${TerminalStyle.FG_GREEN}${server.address().port}`);
});

process.on("message", (msg) => {
	if (msg === "memoryUsageRequest") {
		const memoryUsage = process.memoryUsage();
		process.send({
			type: "memoryUsageResponse",
			heapUsed: memoryUsage.heapUsed,
		});
	} else if (msg === "shutdown") {
		cleanup("shutdown");
	}
});

let shutdown = false;
process.on("SIGINT", () => {
	// Ctrl+C
	cleanup("SIGINT");
});

process.on("SIGHUP", () => {
	// ターミナルを閉じる
	cleanup("SIGHUP");
});

process.on("SIGTERM", () => {
	// taskkill
	cleanup("SIGTERM");
});

process.on("exit", () => {
	// プロセス終了時
	cleanup("exit");
});

function cleanup(type) {
	if (shutdown) {
		return;
	}
	shutdown = true;
	sessionStore.close(() => {
		log.log(`[${type}] MySQL close - main.js`);
	});

	connection.end().then(() => {
		log.log(`[${type}] MySQL disconnected - main.js`);
	});

	server.close(() => {
		log.log(`[${type}] Server close - main.js`);
		if (type !== "exit") {
			process.exit(0);
		}
	});

	log.log(`[${type}] cleanup - main.js`);
}

// ##################################################
// ルーティング
// ##################################################

// index
app.get("/", view.index);

// account
app.get("/login", (req, res) => {
	if (req.session?.username) {
		res.redirect("/game/menu");
		return;
	}
	res.render("account/login.ejs");
});
app.post("/login", (req, res) => {
	if (req.session?.username) {
		res.redirect("/game/menu");
		return;
	}

	accounts
		.isCheck(req.body.username)
		.then((result) => {
			if (!result || !accounts.checkHash(req.body.password, result.password)) {
				res.render("account/login.ejs", {
					error: "ユーザー名またはパスワードに誤りがあります。",
				});
				return;
			}
			req.session.userid = result.id;
			req.session.username = req.body.username;
			res.redirect("/game/menu");
		})
		.catch((err) => {
			res.render("account/login.ejs", {
				error: "不明なエラーが発生しました。",
			});
		});
});

app.get("/signup", (req, res) => {
	if (req.session?.username) {
		res.redirect("/game/menu");
		return;
	}
	res.render("account/signup.ejs");
});
app.post("/signup", (req, res) => {
	if (req.session?.username) {
		res.redirect("/game/menu");
		return;
	}

	accounts
		.addUser(req.body.username, req.body.password1, req.body.password2)
		.then((result) => {
			if (!result) {
				res.render("account/signup.ejs", {
					error: "入力されたユーザー名はすでに使われています。",
				});
				return;
			}
			req.session.userid = result;
			req.session.username = req.body.username;
			res.redirect("/game/menu");
		})
		.catch((err) => {
			res.render("account/signup.ejs", {
				error: "不明なエラーが発生しました。",
			});
		});
});

app.get("/logout", (req, res) => {
	if (!req.session?.username) {
		res.redirect("/login");
		return;
	}
	req.session.destroy();
	res.redirect("/login");
});

// game
app.use("/game/*", (req, res, next) => {
	if (!req.session?.username) {
		res.redirect("/login");
		return;
	}
	next();
});

app.get("/game/menu", view.menu);

app.get("/game/startup", view.startup_get);
app.post("/game/startup", view.startup_post);

app.get("/game/map", view.map_get);
app.post("/game/map", view.map_post);

app.get("/game/quiz", view.quiz_get);
app.get("/game/result/:gameid", view.result_get);
app.get("/game/resultList/:userid(\\d+)", view.resultList_get);
app.get("/game/rank", view.rank_get);

// api
app.use("/api/*", (req, res, next) => {
	if (!req.session?.username) {
		res.status(401).send("Unauthorized");
		return;
	}
	if (!req.session?.gameid) {
		res.status(400).send("Not found gameData");
		return;
	}
	next();
});

app.post("/api/map.json", view.json_getMap);
app.post("/api/enemy.json", view.json_getEnemy);
app.post("/api/choices.json", view.json_getChoices);
app.post("/api/quiz.json", view.json_getQuiz);
app.post("/api/answer.json", view.json_checkAnswer);

// 紅茶大好き
app.get("/teapot", (req, res) => {
	res.status(418).render("err/418.ejs");
});

// ##################################################
// エラーハンドラ
// ##################################################

// 404ハンドラー
app.all("*", (req, res) => {
	log.warn(`404: ${req.originalUrl}`);
	res.render("err/404.ejs");
});

// エラーハンドラー
app.use((err, req, res, next) => {
	if (err.errno === -4048) {
		log.err(`${TerminalStyle.FG_L_BLACK}${TerminalStyle.DIM}${err.message}`);
		return;
	}
	log.err(TerminalStyle.FG_L_RED, err.stack);
	if (!res.headersSent) {
		res.status(500);
		res.render("err/500.ejs");
	}
});

// エラーハンドラー(最終)
app.use((err, req, res, next) => {
	log.err(TerminalStyle.FG_L_RED + TerminalStyle.BLINK, "----------------------------------------");
	log.err(TerminalStyle.FG_L_YELLOW + TerminalStyle.BOLD + TerminalStyle.BLINK, "重大なエラー発生:");
	log.err(TerminalStyle.FG_L_RED, err?.stack);
	log.err(TerminalStyle.FG_L_RED + TerminalStyle.BLINK, "----------------------------------------");
	res.status(500).send("Something broke!");
});
