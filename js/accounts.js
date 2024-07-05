const bcrypt = require("bcrypt");

const { Log } = require("./lib/util");
const useDB = require("./lib/useDB");

const log = new Log(process.env.WORKER_ID);

module.exports = {
	// パスワードハッシュ化
	getHash(password) {
		return bcrypt.hashSync(password, 10);
	},

	// ハッシュチェック
	checkHash(password, hash) {
		return bcrypt.compareSync(password, hash);
	},

	// ユーザー名のバリデーション
	usernameValidation(username) {
		let usl = username.length;
		if (usl < 2) {
			return false;
		} else if (usl > 20) {
			return false;
		}
		return true;
	},

	// パスワードのバリデーション
	passwordValidation(password) {
		let psl = password.length;
		if (psl < 8) {
			return false;
		} else if (psl > 20) {
			return false;
		}
		return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(password);
	},

	// ユーザー名重複チェック
	isCheck(name) {
		return new Promise((resolve, reject) => {
			useDB
				.select("users", "*", { name })
				.then((rows) => {
					resolve(rows?.[0] ?? false);
				})
				.catch((err) => {
					resolve(false);
				});
		});
	},

	// ユーザー追加
	async addUser(name, password1, password2) {
		if (password1 !== password2) {
			return false;
		}
		const password_hash = this.getHash(password1);

		if (!this.usernameValidation(name) || !this.passwordValidation(password1)) {
			log.debug_log(`Invalid username or password: ${name}`);
			return false;
		}

		const isExistence = await this.isCheck(name);

		if (isExistence) {
			log.debug_log(`User already exists: ${name}`);
			return false;
		}

		const row = await useDB.insert("users", {
			name,
			password: password_hash,
		});
		log.debug_log(`New user: ${name}(${row})`);
		return row;
	},
};
