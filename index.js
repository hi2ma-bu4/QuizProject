// .env読み込み
require("dotenv").config();

const cluster = require("node:cluster");

const { Log, TerminalStyle, ConvertType } = require("./js/lib/util");
Log.setting(ConvertType.toBool(process.env.DEBUG));

// 負荷分散の方法指定(os依存)
cluster.schedulingPolicy = cluster.SCHED_NONE;

// CPU数を取得
const cpus = require("node:os").cpus().length;

const maxWorker = Math.min(cpus, process.env.MAX_WORKER_COU);

if (cluster.isPrimary) {
	Log.log(`Master ${process.pid} has started`);
	const { findAvailablePort, getLocalIP } = require("./js/lib/serverUtil");

	if (process.env.IP == null || process.env.IP == "") {
		Log.log("--------------------");
		Log.log("IP自動設定");
		const nowIP = getLocalIP();
		global.IP = nowIP;
		Log.log("Current IPv4: " + nowIP);
		Log.log("--------------------");
	} else {
		global.IP = process.env.IP;
	}
	if (process.env.PORT != null && process.env.PORT != "") {
		portCheck(process.env.PORT);
	} else {
		portCheck(8000);
	}
	async function portCheck(tmpPort) {
		while (!(await findAvailablePort(global.IP, tmpPort))) {
			tmpPort++;
		}

		global.PORT = tmpPort;
		if (process.env.PORT != tmpPort) {
			Log.warn("--------------------");
			Log.warn("PORT自動設定");
			if (process.env.PORT != null && process.env.PORT != "") {
				Log.warn("OLD PORT: " + process.env.PORT);
				Log.warn("↓");
			}
			Log.warn("PORT: " + global.PORT);
			Log.warn("--------------------");
		}

		Log.log(`${TerminalStyle.BOLD}${TerminalStyle.FG_L_RED}ターミナルを終了する時は${TerminalStyle.FG_L_YELLOW}exit${TerminalStyle.FG_L_RED}コマンドを入力して下さい。`);

		Log.log(`URL: ${TerminalStyle.FG_L_GREEN}http://${global.IP}:${global.PORT}`);

		const { ClusterMemoryStorePrimary } = require("@express-rate-limit/cluster-memory-store");
		const rateLimiterStore = new ClusterMemoryStorePrimary();
		rateLimiterStore.init();

		let shutdown = false;
		const workers = {};
		for (let i = 1; i <= maxWorker; i++) {
			Log.debug_log(`Worker [${i}] fork`);
			const cl_worker = cluster.fork({
				WORKER_ID: i,
				IP: global.IP,
				PORT: global.PORT,
			});
			workers[i] = cl_worker;
		}
		cluster.on("exit", (worker) => {
			Log.warn(`Worker [${worker.id}] ${worker.process.pid} died`);
			delete workers[worker.id];
			if (!shutdown) {
				const cl_worker = cluster.fork({
					WORKER_ID: worker.id,
				});
				workers[worker.id] = cl_worker;
			}
		});

		process.on("SIGINT", () => {
			cleanup("SIGINT");
		});

		process.on("SIGHUP", () => {
			cleanup("SIGHUP");
		});

		process.on("SIGTERM", () => {
			cleanup("SIGTERM");
		});

		process.on("exit", () => {
			cleanup("exit");
		});

		function cleanup(type) {
			return new Promise((resolve) => {
				if (!shutdown) {
					for (let key in workers) {
						Log.log("Worker " + key + " is shutting down...");
						workers[key].send("shutdown");
					}
					shutdown = true;
				}
				delay();

				function delay() {
					if (Object.keys(workers).length == 0) {
						Log.log("Worker停止完了");
						if (type !== "stop" && type !== "restart") {
							Log.log("Master " + process.pid + " is shutting down...");
							process.exit(0);
						}
						resolve();
					} else {
						setTimeout(delay, 100);
					}
				}
			});
		}

		// 定期実行タスク実行
		const regularExecution = require("./js/regularExecution");
		regularExecution.setWorkerMemoryGetter(() => getMemoryUsageFromWorkers(workers));

		process.stdin.setEncoding("utf8");

		var reader = require("readline").createInterface({
			input: process.stdin,
		});

		reader.on("line", (line) => {
			line = line.trim();
			switch (line.toLowerCase()) {
				case "start":
				case "res":
				case "restart":
				case "reboot":
					cleanup("restart").then(() => {
						const { spawnSync } = require("node:child_process");
						Log.log("Master " + process.pid + " is restarting...");
						spawnSync("start", ["cmd /c", "runServer.bat"], {
							stdio: "ignore",
							shell: true,
						});
						cleanup("exit");
					});
					break;
				case "stop":
					if (shutdown) {
						Log.warn("すでに停止しています。");
					} else {
						cleanup("stop");
					}
					break;
				case "exit":
				case "end":
					cleanup("shutdown");
					break;
				default:
					Log.warn(`Unknown command: ${line}`);
					Log.warn("コマンド一覧");
					Log.warn("stop: worker停止");
					Log.warn("restart: 再起動");
					Log.warn("exit: 終了");
					break;
			}
		});
		reader.on("close", () => {
			console.log("end read");
		});
	}

	function getMemoryUsageFromWorkers(workers) {
		const pro = [];

		for (let key in workers) {
			pro.push(
				new Promise((resolve) => {
					const worker = workers[key];
					worker.send("memoryUsageRequest");
					worker.once("message", (message) => {
						if (message.type === "memoryUsageResponse") {
							resolve(message.heapUsed);
						}
					});
				})
			);
		}

		return Promise.all(pro);
	}
} else {
	Log.log(`Worker has [${cluster.worker.id}] ${process.pid} started`);

	// 本体呼び出し
	require("./js/main");
}
