const mysql2 = require("mysql2");

const { Log, isAssociative } = require("./util");

const log = new Log(process.env.WORKER_ID);

// DB接続
const connection = mysql2.createConnection({
	host: process.env.MYSQL_HOST,
	port: process.env.MYSQL_PORT,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DB,
	stringifyObjects: true,
	charset: "utf8mb4",
});

// エラー表示
connection.connect((err) => {
	if (err) {
		log.err("MySQL Error connecting: " + err.stack);
		return;
	}
	log.log("MySQL connected");
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

	connection.end(() => {
		log.log(`[${type}] MySQL disconnected - useDB.js`);
	});
}

class UseUB {
	static select(table, keys = "*", where = {}, oderBy = []) {
		return new Promise((resolve, reject) => {
			let sql = `SELECT ${keys} FROM ${table}`;
			const w_keys = Object.keys(where);
			if (isAssociative(where) && w_keys.length > 0) {
				sql += ` WHERE ${w_keys.join("=? AND ")}=?`;
			}

			if (oderBy && Array.isArray(oderBy) && oderBy.length > 0) {
				sql += ` ORDER BY ${oderBy.join(", ")}`;
			}
			connection.query(sql, Object.values(where), (err, rows) => {
				if (err) {
					log.err("MySQL Error: " + err.stack);
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	static insert(table, data = {}) {
		return new Promise((resolve, reject) => {
			let keys = Object.keys(data);
			if (!isAssociative(data) || keys.length <= 0) {
				return false;
			}
			const val = new Array(keys.length).fill("?").join(", ");

			let sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${val})`;
			connection.query(sql, Object.values(data), (err, rows) => {
				if (err) {
					log.err("MySQL Error: " + err.stack);
					reject(err);
				} else {
					resolve(rows.insertId);
				}
			});
		});
	}

	static update(table, data = {}, where = {}) {
		return new Promise((resolve, reject) => {
			let sql = `UPDATE ${table} SET `;
			const d_keys = Object.keys(data);
			if (!isAssociative(data) || d_keys.length <= 0) {
				return false;
			}
			sql += d_keys.join("=?, ") + "=?";
			const w_keys = Object.keys(where);
			if (isAssociative(where) && w_keys.length > 0) {
				sql += ` WHERE ${w_keys.join("=? AND ")}=?`;
			} else {
				log.err("一括更新防止対策: where条件がありません");
				reject(false);
				return;
			}
			connection.query(sql, [...Object.values(data), ...Object.values(where)], (err, rows) => {
				if (err) {
					log.err("MySQL Error: " + err.stack);
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	static autoUpdate(table, data = {}, where = {}) {
		return new Promise((resolve, reject) => {
			UseUB.select(table, "*", where).then((rows) => {
				if (rows.length > 0) {
					UseUB.update(table, data, where).then((result) => {
						resolve(result);
					});
				} else {
					UseUB.insert(table, data).then((result) => {
						resolve(result);
					});
				}
			});
		});
	}

	static delete(table, where = {}) {
		return new Promise((resolve, reject) => {
			let sql = `DELETE FROM ${table}`;
			const w_keys = Object.keys(where);
			if (isAssociative(where) && w_keys.length > 0) {
				sql += ` WHERE ${w_keys.join("=? AND ")}=?`;
			} else {
				log.err("一括消し防止対策: where条件がありません");
				reject(false);
				return;
			}
			connection.query(sql, Object.values(where), (err, rows) => {
				if (err) {
					log.err("MySQL Error: " + err.stack);
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}

	static manualSql(sql, data = []) {
		return new Promise((resolve, reject) => {
			connection.query(sql, data, (err, rows) => {
				if (err) {
					log.err("MySQL Error: " + err.stack);
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});
	}
}

module.exports = UseUB;
