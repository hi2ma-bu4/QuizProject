const { Log } = require("./lib/util");

const QuizManager = require("./lib/quizManager");
const GameManager = require("./lib/gameManager");
const UseDB = require("./lib/useDB");

const log = new Log(process.env.WORKER_ID);

module.exports = {
	index(req, res) {
		res.render("index.ejs", {
			quizCouList: QuizManager.getQuizCouList(),
		});
	},

	menu(req, res) {
		GameManager.getGameList(req.session.userid, false).then((rows) => {
			res.render("game/menu.ejs", {
				games: rows,
			});
		});
	},

	startup_get(req, res) {
		GameManager.getGameList(req.session.userid, false).then((rows) => {
			if (rows.length >= 5) {
				res.redirect("/game/menu");
				return;
			}
			res.render("game/startup.ejs");
		});
	},
	startup_post(req, res) {
		if (req.body.gameid) {
			GameManager.getGameData(req.body.gameid)
				.then((result) => {
					if (!result) {
						res.redirect("/game/menu");
						return;
					}
					if (result.user != req.session.userid) {
						res.redirect("/game/menu");
						return;
					}

					req.session.gameid = result.id;
					req.session.seed = result.seed;
					req.session.answer_count = result.answer_count;

					res.redirect("/game/map");
				})
				.catch((err) => {
					log.err(err);
					res.redirect("/game/menu");
				});
			return;
		}
		GameManager.getGameList(req.session.userid, false).then((rows) => {
			if (rows.length >= 5) {
				res.redirect("/game/menu");
				return;
			}

			GameManager.startGame(req.session.userid)
				.then((result) => {
					log.debug_log(`[${req.session.username}] startup - ${result.id}`);
					req.session.gameid = result.id;
					req.session.seed = result.seed;
					req.session.answer_count = 0;
					res.redirect("/game/quiz");
				})
				.catch((err) => {
					log.err(err);
					res.redirect("/game/startup");
				});
		});
	},

	map_get(req, res) {
		if (!req.session?.gameid) {
			res.redirect("/game/menu");
			return;
		}
		UseDB.select("answer_result", "*", {
			id: req.session.gameid,
			user: req.session.userid,
		}).then((rows) => {
			if (rows.length <= 0) {
				res.redirect("/game/menu");
				return;
			}
			if (rows[0].pageType == "result") {
				res.redirect(`/game/result/${req.session.gameid}/`);
				return;
			}
			if (rows[0].pageType != "map") {
				res.redirect("/game/quiz");
				return;
			}
			res.render("game/map.ejs");
		});
	},

	map_post(req, res) {
		if (!req.session?.gameid) {
			res.redirect("/game/menu");
			return;
		}
		const next_mapid = req.body?.mapid;
		if (!next_mapid) {
			res.redirect("/game/map");
			return;
		}
		UseDB.select("answer_result", "*", {
			id: req.session.gameid,
			user: req.session.userid,
		}).then((rows) => {
			if (rows.length <= 0) {
				res.redirect("/game/menu");
				return;
			}
			if (rows[0].pageType != "map") {
				res.redirect("/game/quiz");
				return;
			}
			const map = GameManager.createMap(req.session.seed, 7);
			let now_mapid = rows[0].now_mapid;
			let flag = false;
			for (let i = 0, li = map.length; i < li; i++) {
				for (let j = 0, lj = map[i].length; j < lj; j++) {
					if ((map[i][j].id = now_mapid)) {
						if (next_mapid == "end" && map[i][j].next.length == 0) {
							flag = true;
							break;
						}
						if (map[i][j].next.includes(next_mapid)) {
							flag = true;
							break;
						}
					}
				}
			}
			if (flag) {
				if (next_mapid == "end") {
					UseDB.update(
						"answer_result",
						{
							now_mapid: "end",
							pageType: "result",
						},
						{
							id: req.session.gameid,
							user: req.session.userid,
						}
					).then(() => {
						res.redirect(`/game/result/${req.session.gameid}/`);
					});
					return;
				}
				UseDB.update(
					"answer_result",
					{
						now_mapid: next_mapid,
						pageType: "quiz",
					},
					{
						id: req.session.gameid,
						user: req.session.userid,
					}
				).then(() => {
					res.redirect("/game/quiz");
				});
			} else {
				log.warn("next_mapid error: ", next_mapid);
				res.redirect("/game/map");
			}
		});
	},

	quiz_get(req, res) {
		if (!req.session?.gameid) {
			res.redirect("/game/menu");
			return;
		}
		UseDB.select("answer_result", "*", {
			id: req.session.gameid,
			user: req.session.userid,
		}).then((rows) => {
			if (rows.length <= 0) {
				res.redirect("/game/menu");
				return;
			}
			if (rows[0].pageType == "result") {
				res.redirect(`/game/result/${req.session.gameid}/`);
				return;
			}
			if (rows[0].pageType != "quiz") {
				res.redirect("/game/map");
				return;
			}
			res.render("game/quiz.ejs");
		});
	},

	result_get(req, res) {
		const gameid = req.params.gameid;

		UseDB.select("answer_result", "*", {
			id: gameid,
		})
			.then((rows) => {
				if (rows.length <= 0) {
					res.redirect(`/game/resultList/${req.session.userid}/`);
					return;
				}
				if (rows[0].pageType != "result") {
					res.redirect(`/game/resultList/${req.session.userid}/`);
					return;
				}
				UseDB.select("users", "*", {
					id: rows[0].user,
				})
					.then((userRows) => {
						UseDB.select("subject_result", "*", {
							answer_result_id: gameid,
						})
							.then((subjectRows) => {
								res.render("game/result.ejs", {
									pageUsername: userRows[0].name,
									pageUserid: userRows[0].id,
									game: rows[0],
									subjects: subjectRows,
									genres: QuizManager._genres,
								});
							})
							.catch(err);
					})
					.catch(err);
			})
			.catch(err);
		return;
		function err(e) {
			log.err(e);
			res.redirect("/game/menu");
		}
	},

	resultList_get(req, res) {
		const userid = req.params.userid;
		UseDB.select("users", "*", {
			id: userid,
		})
			.then((userRows) => {
				GameManager.getGameStatistics(userid)
					.then((gameStatistics) => {
						GameManager.getGameList(userid)
							.then((rows) => {
								res.render("game/resultList.ejs", {
									userid: userid,
									results: rows,
									gameStatistics: gameStatistics,
									pageUsername: userRows[0].name,
								});
							})
							.catch(err);
					})
					.catch(err);
			})
			.catch(err);
		return;
		function err(e) {
			log.err(e);
			res.redirect("/game/menu");
		}
	},

	rank_get(req, res) {
		GameManager.getGameStatisticsList()
			.then((rows) => {
				res.render("game/rank.ejs", { results: rows });
			})
			.catch(err);
		return;
		function err(e) {
			log.err(e);
			res.redirect("/game/menu");
		}
	},

	json_getMap(req, res) {
		UseDB.select("answer_result", "*", {
			id: req.session.gameid,
			user: req.session.userid,
		}).then((rows) => {
			if (rows.length <= 0) {
				res.status(204).json({ error: "存在しないデータ" });
				return;
			}
			if (rows[0].pageType != "map") {
				res.status(409).json({ error: "存在しないデータ" });
				return;
			}
			const map = GameManager.createMap(req.session.seed, 7);
			res.json([map, rows[0].now_mapid]);
		});
	},

	json_getEnemy(req, res) {
		GameManager.getDbEnemyList(req.session.gameid, req.session.userid)
			.then((enemyDict) => {
				res.json(enemyDict);
			})
			.catch((err) => {
				log.err(err);
				res.status(204).json({ error: "存在しないデータ" });
			});
	},

	json_getChoices(req, res) {
		res.json(GameManager.getQuizGenreChoice(req.session.seed, req.session.answer_count));
	},

	json_getQuiz(req, res) {
		const json = GameManager.getQuiz(req.session.seed, req.session.answer_count, req.body.choiceIndex);
		if (!json) {
			res.status(204).json({ error: "存在しないデータ" });
			return;
		}
		res.json(json);
	},

	json_checkAnswer(req, res) {
		let json = GameManager.checkAnswer(req.session.seed, req.session.answer_count, req.body.choiceIndex, req.body.answer);
		if (!json) {
			res.status(204).json({ error: "存在しないデータ" });
			return;
		}
		[json, genreChoice] = json;

		UseDB.select("answer_result", "*", {
			id: req.session.gameid,
			user: req.session.userid,
		}).then((rows) => {
			if (rows.length <= 0) {
				res.status(204).json({ error: "存在しないデータ" });
				return;
			}
			if (rows[0].answer_count != req.session.answer_count || rows[0].pageType != "quiz") {
				res.status(409).json({ error: "データが変更されています。" });
				return;
			}
			UseDB.update(
				"answer_result",
				{
					answer_count: rows[0].answer_count + 1,
				},
				{
					id: req.session.gameid,
					user: req.session.userid,
				}
			).then(subjectUpdate);
		});
		return;
		function subjectUpdate(result) {
			if (!result) {
				log.err("autoUpdate error1");
				res.status(400).json({ error: "DB更新失敗" });
			}
			req.session.answer_count++;
			const where = {
				answer_result_id: req.session.gameid,
				genre: genreChoice.genre,
			};
			UseDB.select("subject_result", "*", where)
				.then((rows) => {
					let count = rows?.[0]?.count ?? 0;
					if (json.correctAnswer === true) {
						count++;
					}
					let pro = null;
					if (rows.length > 0) {
						pro = UseDB.update(
							"subject_result",
							{
								answer_count: rows[0].answer_count + 1,
								count: count,
							},
							where
						);
					} else {
						pro = UseDB.insert("subject_result", {
							answer_result_id: req.session.gameid,
							genre: genreChoice.genre,
							answer_count: 1,
							count: count,
						});
					}
					pro.then((result) => {
						if (!result) {
							log.err("autoUpdate error2");
							res.status(400).json({ error: "DB更新失敗" });
						}

						enemyUpdate();
					}).catch((err) => {
						log.err(err);
						res.status(501).json({ error: "不明なエラーが発生しました。" });
					});
				})
				.catch((err) => {
					log.err(err);
					res.status(501).json({ error: "不明なエラーが発生しました。" });
				});
		}
		function enemyUpdate() {
			UseDB.select("tmp_enemy", "*", {
				answer_result_id: req.session.gameid,
			}).then((rows) => {
				if (rows.length <= 0) {
					res.status(204).json({ error: "存在しないデータ" });
					return;
				}

				if (json.correctAnswer !== true) {
					res.json(json);
					return;
				}
				const enemyHpDict = {};
				for (let i = 0, li = rows.length; i < li; i++) {
					enemyHpDict[rows[i].pos] = rows[i].hp;
				}

				// 基礎攻撃力
				let atk = 3;
				// 問題レベルで攻撃力変化
				switch (genreChoice.level) {
					case 1:
						atk *= 1;
						break;
					case 2:
						atk *= 1.5;
						break;
					case 3:
						atk *= 2;
						break;
					case 4:
						atk *= 3;
						break;
				}
				// 回答速度で攻撃力変化
				switch (req.body.evaluation) {
					case "Excellent":
						atk *= 1.5;
						break;
					case "Great":
						atk *= 1;
						break;
					case "Nice":
						atk *= 0.7;
						break;
					case "Good":
						atk *= 0.4;
						break;
				}

				atk |= 0;

				// TODO
				// 記述問題の場合 全体攻撃
				if (genreChoice.write === 0) {
					// 単体
					let pos;
					if (0) {
						// 対象指定あり で対象がいない
					}
					if (1) {
						// 対象指定なし
						let keys = Object.keys(enemyHpDict);
						pos = keys[Math.floor(Math.random() * keys.length)];
					}

					enemyHpDict[pos] -= atk;
				} else {
					// 全体
					for (const pos in enemyHpDict) {
						enemyHpDict[pos] -= atk;
					}
				}

				GameManager.setEnemyHpList(req.session.gameid, enemyHpDict).then((result) => {
					if (!result) {
						res.status(501).json({ error: "攻撃計算失敗" });
						return;
					}
					json.hp = enemyHpDict;
					json.end = result === 2;
					if (json.end) {
						UseDB.update(
							"answer_result",
							{
								pageType: "map",
							},
							{
								id: req.session.gameid,
								user: req.session.userid,
							}
						)
							.then((result) => {
								res.json(json);
							})
							.catch((err) => {
								log.err(err);
								res.status(501).json({ error: "不明なエラーが発生しました。" });
							});
						return;
					}
					res.json(json);
				});
			});
		}
	},
};
