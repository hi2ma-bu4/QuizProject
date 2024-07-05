const seedrandom = require("seedrandom");

const { Log, TerminalStyle, JsonLoad } = require("./util");
const UseDB = require("./useDB");

const QuizManager = require("./quizManager");

const log = new Log(process.env.WORKER_ID);

const MAX_SEED = (Number.MAX_SAFE_INTEGER / 1e3) | 0;

const BASE_NODE_IMG_URL = "/img/map/";
const BASE_ENEMY_IMG_URL = "/img/enemy/";
const BASE_JSON_PATH = require("node:path").join(__dirname, "../../json/game/");

// ゲーム管理クラス
class GameManager {
	// json取得
	static getJson(name) {
		return JsonLoad.readFile(`${BASE_JSON_PATH}${name}.json`);
	}

	// ゲームリスト取得
	static getGameList(userid, result = true) {
		return new Promise((resolve, reject) => {
			UseDB.select(
				"answer_result",
				"*",
				{
					user: userid,
				},
				["updated_at DESC"]
			)
				.then((rows) => {
					if (!result) {
						for (let i = rows.length - 1; i >= 0; i--) {
							if (rows[i].pageType === "result") {
								rows.splice(i, 1);
							}
						}
					}
					resolve(rows);
				})
				.catch((err) => {
					log.err(err);
					resolve([]);
				});
		});
	}

	// ゲーム統計
	static getGameStatistics(userid) {
		return new Promise((resolve, reject) => {
			const sql = `SELECT SUM(sr.count) AS count_, SUM(sr.answer_count) AS answer_count_ FROM answer_result AS ar JOIN subject_result AS sr ON ar.id = sr.answer_result_id WHERE ar.user = ?`;
			UseDB.manualSql(sql, [userid])
				.then((rows) => {
					resolve({
						answer_count: rows[0].answer_count_ ?? 0,
						count: rows[0].count_ ?? 0,
					});
				})
				.catch(reject);
		});
	}

	// ゲーム統計リスト
	static getGameStatisticsList() {
		const sql = `SELECT ar.user, users.name, SUM(t_answer_count) AS total_answer_count, SUM(t_count) AS total_count,MAX(tc.avg_cou) AS max_percentage FROM answer_result AS ar JOIN (SELECT answer_result_id, SUM(answer_count) AS t_answer_count, SUM(count) AS t_count, (SUM(count) * 100.0 / SUM(answer_count)) AS avg_cou FROM subject_result GROUP BY answer_result_id) AS tc ON ar.id = tc.answer_result_id JOIN users ON users.id = ar.user GROUP BY ar.user ORDER BY max_percentage DESC`;
		return UseDB.manualSql(sql);
	}

	// ゲーム開始
	static startGame(userid) {
		return new Promise((resolve, reject) => {
			const json = {
				user: userid,
				seed: (Math.random() * MAX_SEED) | 0,
				now_mapid: "1",
			};
			UseDB.insert("answer_result", json).then((result) => {
				resolve({ ...json, id: result });
			});
		});
	}

	// 現在の進行取得
	static getGameData(gameId) {
		return new Promise((resolve, reject) => {
			const json = {
				id: gameId,
			};
			UseDB.select("answer_result", "*", json)
				.then((rows) => {
					resolve(rows[0]);
				})
				.catch((err) => {
					log.err(err);
					resolve(null);
				});
		});
	}

	// ジャンル選択肢取得
	static getQuizGenreChoice(seed = 0, answer_count = 0) {
		const rng = seedrandom(seed + answer_count);

		const arr = [];
		for (let i = 0; i < 4; i++) {
			const tmp = {
				genre: QuizManager.randomGenre(rng),
				level: QuizManager.randomLevel(rng),
			};
			tmp.index = QuizManager.randomQuizIndex(tmp.genre, tmp.level, rng);
			tmp.write = QuizManager.getWrite(tmp.genre, tmp.level, tmp.index);
			if (tmp.write == null) {
				tmp.write = 0;
			} else if (tmp.write != 0) {
				// 記入の割合を減らす(40%で選択に)
				//if (Math.random() < 0.4) tmp.write = 0;
			}
			arr.push(tmp);
		}
		return arr;
	}

	// 問題取得
	static getQuiz(seed = 0, answer_count = 0, choiceIndex = 0) {
		const json = {};
		try {
			const arr = this.getQuizGenreChoice(seed, answer_count);
			const genreChoice = arr[choiceIndex];
			const quiz = QuizManager.getQuiz(genreChoice.genre, genreChoice.level, genreChoice.index);
			json.quest = quiz.quest;
			json.choice = this.shuffleArray(Math.random(), quiz.choice.slice());
			json.write = quiz.write ?? 0;
			if (json.write != 0) {
				// 文字数指定
				json.ansLen = quiz.answer.length;
			}
			json.answer_count = answer_count;
			//log.debug_log("ans:", quiz.answer);
		} catch (e) {
			log.debug_warn(e);
			return false;
		}
		return json;
	}

	// 回答判定
	static checkAnswer(seed = 0, answer_count = 0, choiceIndex = 0, ans = "") {
		const json = {};
		let genreChoice = null;
		try {
			const arr = this.getQuizGenreChoice(seed, answer_count);
			genreChoice = arr[choiceIndex];
			const quiz = QuizManager.getQuiz(genreChoice.genre, genreChoice.level, genreChoice.index);
			ans = ("" + ans).toLowerCase();
			const ok = ("" + quiz.answer).toLowerCase() == ans;

			log.debug_log(`${TerminalStyle.DIM}${quiz.quest}${TerminalStyle.NO_DIM}`);
			log.debug_log(`${TerminalStyle.DIM}→ ${quiz.answer}(回答: ${TerminalStyle.FG_GREEN}${ans}${TerminalStyle.FG_WHITE}) →  ${TerminalStyle.NO_DIM}${ok ? "正解" : "不正解"}`);
			json.correctAnswer = ok ? true : quiz.answer;
		} catch (e) {
			log.debug_warn(e);
			return false;
		}
		return [json, genreChoice];
	}

	// seed付きシャッフル
	static shuffleArray(seed = 0, arr = []) {
		const rng = seedrandom(seed);

		for (let i = arr.length - 1; i > 0; i--) {
			const j = (rng() * (i + 1)) | 0;
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}

		return arr;
	}

	// 敵情報取得
	static getEnemy(enemyType, enemyIndex) {
		const enemyJson = this.getJson("enemy");

		const enemyList = enemyJson[enemyType];
		const enemy = enemyList[enemyIndex];

		return {
			enemy: {
				name: enemy.name,
				image: BASE_ENEMY_IMG_URL + enemy.image,
				hp: enemy.hp,
				maxHp: enemy.hp,
				atk: enemy.atk,
				size: enemy.size,
			},

			enemyType: enemyType,
			enemyIndex: enemyIndex,
		};
	}

	// 敵情報取得(リスト)
	static getEnemyList(seed = 0, mapid = "2") {
		const rng = seedrandom(`${seed}${mapid}`);

		const row = mapid.split("-")[0];

		const enemyJson = this.getJson("enemy");
		const enemyTable = this.getJson("enemyTable")[row - 2];

		const dict = {};
		const tableData = enemyTable[(rng() * enemyTable.length) | 0];
		for (let i = 0; i < tableData.pos.length; i++) {
			const pos = tableData.pos[i];
			const enemyType = tableData.enemy[(rng() * tableData.enemy.length) | 0];
			const enemyList = enemyJson[enemyType];
			const index = (rng() * enemyList.length) | 0;

			dict[pos] = this.getEnemy(enemyType, index);
		}

		return dict;
	}

	// DBから敵情報取得
	static getDbEnemyList(gameid, userid) {
		return new Promise((resolve, reject) => {
			UseDB.select("answer_result", "*", {
				id: gameid,
				user: userid,
			})
				.then((gameData) => {
					UseDB.select("tmp_enemy", "*", {
						answer_result_id: gameData[0].id,
					})
						.then((rows) => {
							let enemyDict;
							if (rows.length <= 0) {
								enemyDict = this.getEnemyList(gameData[0].seed, gameData[0].now_mapid);
								upd(Object.keys(enemyDict));

								return;
								function upd(arr) {
									if (arr.length <= 0) {
										resolve([enemyDict, gameData[0].now_mapid]);
										return;
									}
									const key = arr.pop();
									UseDB.autoUpdate(
										"tmp_enemy",
										{
											answer_result_id: gameData[0].id,
											category: enemyDict[key].enemyType,
											type_index: enemyDict[key].enemyIndex,
											pos: key,
											hp: enemyDict[key].enemy.hp,
										},
										{
											answer_result_id: gameData[0].id,
											pos: key,
										}
									)
										.then(() => upd(arr))
										.catch((err) => {
											log.err(err);
											reject(err);
										});
								}
							}
							enemyDict = {};
							for (let i = 0, li = rows.length; i < li; i++) {
								enemyDict[rows[i].pos] = this.getEnemy(rows[i].category, rows[i].type_index);
								enemyDict[rows[i].pos].enemy.hp = rows[i].hp;
							}
							resolve([enemyDict, gameData[0].now_mapid]);
						})
						.catch((err) => {
							reject(err);
						});
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	// hpを更新
	static setEnemyHpList(gameid, enemyHpDict) {
		return new Promise((resolve) => {
			UseDB.select("tmp_enemy", "*", {
				answer_result_id: gameid,
			}).then(async (rows) => {
				if (rows.length <= 0) {
					resolve(0);
					return;
				}
				try {
					let endFlag = true;
					for (let i = 0, li = rows.length; i < li; i++) {
						let hp = enemyHpDict[rows[i].pos];
						if (hp <= 0) {
							await UseDB.delete("tmp_enemy", {
								answer_result_id: gameid,
								pos: rows[i].pos,
							});
							continue;
						}
						await UseDB.update(
							"tmp_enemy",
							{
								hp: hp,
							},
							{
								answer_result_id: gameid,
								pos: rows[i].pos,
							}
						);
						endFlag = false;
					}

					if (endFlag) {
						resolve(2);
					} else {
						resolve(1);
					}
				} catch (e) {
					log.err(e);
					resolve(0);
				}
			});
		});
	}

	// マップ生成
	static createMap(seed = 0, depth = 6) {
		const rng = seedrandom(seed);
		const map = [];
		const nodeList = [];

		// スタート地点
		const startNode = {
			id: "1",
			next: [],
			img: `${BASE_NODE_IMG_URL}icon090.png`,
		};
		map.push([startNode]);

		for (let level = 1; level < depth; level++) {
			const currentLevelNodes = map[level - 1];
			const nextLevelNodes = [];
			const newNodeMap = new Map();
			let nextLevelIndex = 1;

			currentLevelNodes.forEach((node) => {
				// 3/7で減らし、1/7で変えず、3/7で追加
				let childrenCount = (rng() * 7 - 2) | 0;

				if (childrenCount > 2) {
					childrenCount = 2;
				}
				if (nextLevelIndex + childrenCount >= 4) {
					childrenCount = (rng() * 2) | 0;
				}
				if (childrenCount <= 0) {
					childrenCount = 1;
					if (nextLevelIndex !== 1) {
						nextLevelIndex--;
					}
				}
				for (let i = 0; i < childrenCount; i++) {
					const newNodeId = `${level + 1}-${String.fromCharCode(65 + ((nextLevelIndex - 1) % 26))}`;
					let newNode;

					if (newNodeMap.has(newNodeId)) {
						newNode = newNodeMap.get(newNodeId);
					} else {
						newNode = {
							id: newNodeId,
							next: [],
							img: `${BASE_NODE_IMG_URL}icon002.png`,
						};
						newNodeMap.set(newNodeId, newNode);
						nextLevelNodes.push(newNode);
						nodeList.push(newNode);
					}
					nextLevelIndex++;
					node.next.push(newNode.id);
					if (i > 0) {
						if (rng() < 0.5) {
							let back = nextLevelNodes[i - 1].id;
							if (back !== newNode.id) {
								node.next.push(back);
							}
						}
					}
				}
			});

			map.push(nextLevelNodes);
		}

		// アイテムステージ
		//const itemNode = nodeList[(rng() * (nodeList.length - 1) + 1) | 0];
		//itemNode.img = `${BASE_NODE_IMG_URL}icon020.png`;

		// ボス追加
		const endNode = {
			id: `${depth + 1}`,
			next: [],
			img: `${BASE_NODE_IMG_URL}icon053.png`,
		};
		map[depth - 1].forEach((node) => {
			node.next.push(endNode.id);
		});
		map.push([endNode]);

		return map;
	}
}

module.exports = GameManager;
