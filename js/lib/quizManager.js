const { TerminalStyle, Log, JsonLoad } = require("./util");

const log = new Log(process.env.WORKER_ID);

// クイズ先行読み込み
setTimeout(() => {
	log.log("QuizManager.loadAll() Start");
	QuizManager.loadAll();
	log.log("QuizManager.loadAll() End");
}, 100 * process.env.WORKER_ID);

// クイズ管理
class QuizManager {
	static baseUrl = require("node:path").join(__dirname, "../../json/quiz/");
	static _genres = ["文系", "漢字", "英語", "スポーツ", "理系", "計算", "情報IT", "雑学"];
	static _genresLen = this._genres.length;
	static _maxLevel = 4;

	static cache = new Map();

	// クイズデータ一覧読み込み
	static loadAll() {
		for (let genre of this._genres) {
			for (let level = 1; level <= this._maxLevel; level++) {
				this.getQuizList(genre, level);
			}
		}
	}

	// クイズ問題数取得
	static getQuizCouList() {
		const list = {};
		for (let genre of this._genres) {
			for (let level = 1; level <= this._maxLevel; level++) {
				const json = this.getQuizList(genre, level);
				if (!json) {
					continue;
				}
				list[genre] ??= [];
				list[genre][level - 1] = json.length;
			}
		}
		return list;
	}

	// ジャンルランダム取得
	static randomGenre(rng = Math.random) {
		return this._genres[(rng() * this._genresLen) | 0];
	}

	// レベルランダム取得
	static randomLevel(rng = Math.random) {
		return (rng() * this._maxLevel + 1) | 0;
	}

	// indexランダム取得
	static randomQuizIndex(genre, level, rng = Math.random) {
		const json = this.getQuizList(genre, level);
		if (!json) {
			return false;
		}
		return (rng() * json.length) | 0;
	}

	// json読み込み
	static getQuizList(genre, level) {
		if (genre == null || level == null) {
			return false;
		}
		const key = `${genre}/Lv${level}.json`;
		if (this.cache.has(key)) {
			return this.cache.get(key);
		}

		log.debug_log(`${TerminalStyle.FG_L_BLACK}${TerminalStyle.DIM}getQuizPath: ${key}`);
		const json = JsonLoad.readFile(this.baseUrl + key, true);
		if (!json) {
			return false;
		}
		this.cache.set(key, json);
		return json;
	}

	// 問題取得
	static getQuiz(genre, level, index) {
		let list = this.getQuizList(genre, level);
		return list[index];
	}

	// 形式取得
	static getWrite(genre, level, index) {
		return this.getQuizList(genre, level)?.[index]?.write;
	}
}

module.exports = QuizManager;
