{
	let dispType = "init",
		oldDispType = "__init__";

	let nowJson = null;
	let oldJson = null;

	let disableBtnFlag = false;

	const keyboard = {
		alp: ["ABCDEFG", "HIJKLMN", "OPQRSTU", "VWXYZ!$"],
		num: ["123!", "456_", "789_", "-0$_"],
		hira1: ["あかさたな!", "いきしちに゛", "うくすつぬ゜", "えけせてね#", "おこそとの$"],
		hira2: ["はまやらわ!", "ひみゆりを゛", "ふむよるん゜", "へめ_れ_#", "ほも_ろー$"],
		kata1: ["アカサタナ!", "イキシチニ゛", "ウクスツヌ゜", "エケセテネ#", "オコソトノ$"],
		kata2: ["ハマヤラワ!", "ヒミユリヲ゛", "フムヨルン゜", "ヘメ_レ_#", "ホモ_ノー$"],
	};

	// prettier-ignore
	const dakutenMap = {
		か: "が", き: "ぎ", く: "ぐ", け: "げ", こ: "ご",
		さ: "ざ", し: "じ", す: "ず", せ: "ぜ", そ: "ぞ",
		た: "だ", ち: "ぢ", つ: "づ", て: "で", と: "ど",
		は: "ば", ひ: "び", ふ: "ぶ", へ: "べ", ほ: "ぼ",
		カ: "ガ", キ: "ギ", ク: "グ", ケ: "ゲ", コ: "ゴ",
		サ: "ザ", シ: "ジ", ス: "ズ", セ: "ゼ", ソ: "ゾ",
		タ: "ダ", チ: "ヂ", ツ: "ヅ", テ: "デ", ト: "ド",
		ハ: "バ", ヒ: "ビ", フ: "ブ", ヘ: "ベ", ホ: "ボ",
	};
	const reverseDakutenMap = Object.fromEntries(Object.entries(dakutenMap).map(([k, v]) => [v, k]));

	// prettier-ignore
	const handakutenMap = {
		あ: "ぁ", い: "ぃ", う: "ぅ", え: "ぇ", お: "ぉ",
		は: "ぱ", ひ: "ぴ", ふ: "ぷ", へ: "ぺ", ほ: "ぽ",
		つ: "っ", や: "ゃ", ゆ: "ゅ", よ: "ょ", わ: "ゎ",
		ア: "ァ", イ: "ィ", ウ: "ゥ", エ: "ェ", オ: "ォ",
		ハ: "パ", ヒ: "ピ", フ: "ぷ", ヘ: "ペ", ホ: "ポ",
		ツ: "ッ", ヤ: "ャ", ユ: "ュ", ヨ: "ョ", ワ: "ヮ",
	};
	const reverseHandakutenMap = Object.fromEntries(Object.entries(handakutenMap).map(([k, v]) => [v, k]));

	// prettier-ignore
	const dakuten2handakutenMap = {
		づ: "っ",
		ば: "ぱ", び: "ぴ", ぶ: "ぷ", べ: "ぺ", ぼ: "ぽ",
		ヅ: "ッ",
		バ: "パ", ビ: "ピ", ブ: "プ", ベ: "ペ", ボ: "ポ",
	}

	const handakuten2dakutenMap = Object.fromEntries(Object.entries(dakuten2handakutenMap).map(([k, v]) => [v, k]));

	let keyInputCache = [];

	jasc.on("DOMContentLoaded", async function () {
		jasc.on("gameFrameUpdate", update);

		try {
			await dataLoader();
		} catch (e) {
			console.error(e);
			alert("ゲームリソースの読み込みに失敗しました。\nタイトルページに戻ります。");
			location.href = "/game/menu";
			return;
		}
	});

	function update(isDraw = false, isOverFrame = false) {
		changeDisp();
	}

	async function changeDisp() {
		if (dispType === oldDispType) return;
		disableBtnFlag = true;

		oldDispType = dispType;

		const baseY = ch / 2;
		const baseH = ch - baseY;
		const timesBaseY = baseY + 30;

		let w = cw / 2,
			h = baseH / 2;
		let th = (baseH - 30) / 2;

		let box;

		switch (dispType) {
			case "init":
				// 初期値
				dispType = "genreChoice";
				if (!drawObjDict["background"]) {
					//drawObjDict["cc"] = new Item(1, itemData["おにぎり"]);
					//drawObjDict["cd"] = new Item(2, itemData["おにぎり"]);
					//drawObjDict["ce"] = new Item(3, itemData["おにぎり"]);
					let [json, mapid] = await loopGetJson("enemy");

					let bgJson;
					switch (mapid.split("-")[0]) {
						case "1":
						// お家
						case "2":
						case "3":
							bgJson = backgroundData["昼"];
							break;
						case "4":
						case "5":
							bgJson = backgroundData["夕焼け"];
							break;
						case "6":
						case "7":
							bgJson = backgroundData["夜"];
							break;
						case "8":
							bgJson = backgroundData["時空"];
							break;
						default:
							bgJson = backgroundData["昼"];
					}
					drawObjDict["background"] = new BackGround(0, 0, cw, baseY - h / 2, bgJson);
					for (let pos of ["left", "right", "center"]) {
						const enemy = json[pos]?.enemy;
						if (!enemy) continue;
						enemy.image = await getImg(enemy.image);
						drawObjDict[`enemy_${pos}`] = new Enemy(pos, enemy);
					}
				}
				break;
			case "genreChoice":
				// ジャンル選択画面

				noMenu = false;

				if (nowJson == null) {
					nowJson = await loopGetJson("choices");
				}
				resetKey();

				box = createBox("genreQuestion", 0, baseY - h / 2, cw, h / 2, "問題を選択して下さい");
				box.bgColor = "#332211";
				box.bdColor = "#938271";

				for (let i = 0; i < 4; i++) {
					createButton(
						"genre_" + i,
						w * (i % 2),
						baseY + h * ((i / 2) | 0),
						w,
						h,
						nowJson[i].genre,
						() =>
							decisionChoice("genre", {
								index: i,
								json: nowJson?.[i],
							}),
						nowJson[i]
					);
				}
				disableBtnFlag = false;
				break;
			case "quizNumber":
				// 第N問表示

				if (!oldJson) {
					dispType = "genreChoice";
					return;
				}

				noMenu = true;

				nowJson = await loopGetJson("quiz", {
					choiceIndex: oldJson.index,
				});
				nowJson.doSetting = true;
				nowJson.index = oldJson.index;

				box = createBox("questionNumber", 0, baseY - h / 2, cw, h / 2, `第${nowJson.answer_count + 1}問`);
				box.bgColor = "#332211";
				box.bdColor = "#938271";
				box.fgColor = "#aaffaa";
				box.textSize = 60;

				createTimeBar("timer", 0, baseY, cw, 30, 0, {
					onOver: () => {},
				});

				switch (nowJson?.write) {
					case 0:
						// 4択
						for (let i = 0; i < 4; i++) {
							let btn = createButton("choice_" + i, 0, (timesBaseY + (th * i) / 2) | 0, cw, th / 2, "", () => {});
							btn.textSize = 60;
							btn.useAutoReturn = false;
						}
						break;
					case 1:
						// abc
						keySet("keyAlp", keyboard.alp);
						break;
					case 2:
						// 123
						keySet("keyNum", keyboard.num);
						break;
					case 3:
						// あいう
						delKey("keyHira", keyboard.hira2);
						keySet("keyHira", keyboard.hira1);
						break;
					case 4:
						// アイウ
						delKey("keyKata", keyboard.kata2);
						keySet("keyKata", keyboard.kata1);
						break;
					default:
						ccLog.warn("write: " + nowJson?.write);
						nowJson.write = 0;
				}

				// 撤去
				for (let i = 0; i < 4; i++) {
					deadObj("genre_" + i);
				}
				deadObj("genreQuestion");

				createWait(() => {
					dispType = "answerChoice";
				}, 40);
				break;
			case "answerChoice":
				// 問題解答画面1
				if (nowJson?.doSetting) {
					nowJson.doSetting = false;

					box = createBox("question", 0, baseY - h / 2, cw, h / 2, typewriteText(nowJson.quest));
					box.bgColor = "#332211";
					box.bdColor = "#938271";

					disableBtnFlag = false;
					let time = 20000;
					if (nowJson.ansLen) {
						time += nowJson.ansLen * 2000;
					}
					createTimeBar("timer", 0, baseY, cw, 30, time, {
						onOver: timeOver,
					});

					// 入力表示
					if (nowJson?.write) {
						let tmpW = Math.max(w, nowJson.ansLen * 100);
						box = createBox("inputText", (cw / 2 - tmpW / 2) | 0, (h / 2) | 0, tmpW, h / 2, outDispInput(nowJson.ansLen, nowJson.write));
						box.bgColor = "#332211d0";
						box.textSize = 80;
					}

					// 撤去
					deadObj("questionNumber");
				}

				switch (nowJson?.write) {
					case 0:
						// 4択
						for (let i = 0; i < 4; i++) {
							let btn = createButton("choice_" + i, 0, (timesBaseY + (th * i) / 2) | 0, cw, th / 2, nowJson.choice[i], () => decisionChoice("choice", nowJson?.choice?.[i]), nowJson);
							btn.textSize = 60;
							btn.useAutoReturn = false;
						}
						break;
					case 1:
						// abc
						keySet("keyAlp", keyboard.alp);
						break;
					case 2:
						// 123
						keySet("keyNum", keyboard.num);
						break;
					case 3:
						// あいう
						delKey("keyHira", keyboard.hira2);
						keySet("keyHira", keyboard.hira1);
						break;
					case 4:
						// アイウ
						delKey("keyKata", keyboard.kata2);
						keySet("keyKata", keyboard.kata1);
						break;
					default:
						ccLog.warn("write: " + nowJson?.write);
						nowJson.write = 0;
				}
				disableBtnFlag = false;
				break;
			case "answerChoice_sub":
				// 問題解答画面2

				switch (nowJson.write) {
					case 3:
						// あいう
						delKey("keyHira", keyboard.hira1);
						keySet("keyHira", keyboard.hira2);
						break;
					case 4:
						// アイウ
						delKey("keyKata", keyboard.kata1);
						keySet("keyKata", keyboard.kata2);
						break;
				}
				disableBtnFlag = false;
				break;
			case "result":
				// 結果画面(上書き)

				// 結果表示
				y = (ch / 2) | 0;
				w = (Math.min(w, h) * 0.8) | 0;
				if (oldJson?.correctAnswer === true) {
					let evaluation = drawObjDict["timer"].getEvaluation();
					drawObjDict["correct"] = new Correct((cw / 2) | 0, y, w, evaluation);
				} else {
					drawObjDict["incorrect"] = new Incorrect((cw / 2) | 0, y, w);

					if (oldJson?.correctAnswer) {
						const w2 = w * 2;
						box = createBox("answer", ((cw - w2) / 2) | 0, y + w, w2, w, oldJson.correctAnswer);
						box.bgColor = "#332211";
						box.bdColor = "#938271";
						box.textSize = 60;
					}
				}

				// 次へ
				createWait(() => {
					deadObj("inputText");
					deadObj("correct");
					deadObj("incorrect");
					deadObj("answer");
					dispType = "attack";
				}, 90);
				break;
			case "attack":
				// 攻撃

				createWait(async () => {
					let objs = {};
					if (oldJson.hp) {
						let evaluation = drawObjDict["timer"].getEvaluation();
						let evalNum = 1;
						switch (evaluation) {
							case "Excellent":
								evalNum = 4;
								break;
							case "Great":
								evalNum = 3;
								break;
							case "Nice":
								evalNum = 2;
								break;
							case "Good":
								evalNum = 1;
								break;
						}
						for (let pos in oldJson.hp) {
							let enemy = drawObjDict[`enemy_${pos}`];
							objs[pos] = {
								enemy,
								diff: enemy.hp_bar.setHp(oldJson.hp[pos]),
							};
							if (objs[pos].diff > 0) {
								noDiff = false;
								createAttackEffect(enemy.x, enemy.y, Math.min(enemy.w, enemy.h), attackEffectData[`通常攻撃${evalNum}`]);
							}
						}
						createWait(() => {
							for (let pos in objs) {
								const o = objs[pos];
								if (o.diff > 0) {
									createPopup("up", o.enemy.x + o.enemy.w / 2, o.enemy.y + o.enemy.h / 2, `${o.diff}ダメージ`, "#ee0000");
								}
							}
							dispType = "end_init";
						}, 60);
					} else {
						dispType = "end_init";
					}
				}, 30);
				break;
			case "end_init":
				// 戻す
				if (oldJson?.end) {
					createWait(() => {
						drawObjDict["clear"] = new Clear((cw / 2) | 0, (ch / 2) | 0, Math.min(w, h) | 0);
						createWait(() => {
							location.href = "/game/map";
						}, 60);
					}, 120);
					return;
				}
				dispType = "genreChoice";
				break;
			default:
				ccLog.error(`dispType: ${dispType} は存在しません`);
		}
		return;
		function keySet(pre, kb) {
			let blankCou = 0;
			for (let i = 0, li = kb.length; i < li; i++) {
				let _ky = kb[i];
				let _h = ((baseH - 30) / li) | 0;
				let _y = timesBaseY + _h * i;
				for (let j = 0, lj = _ky.length; j < lj; j++) {
					let ch = _ky[j];
					let _w = (cw / lj) | 0;
					let _x = _w * j;
					if (ch === "_") {
						createBox(pre + "Blank_" + blankCou, _x, _y, _w, _h);
						blankCou++;
					} else if (ch === "!") {
						createButton(pre + "_" + ch, _x, _y, _w, _h, "⌫", () => decisionChoice(pre, ch));
					} else if (ch === "$") {
						createButton(pre + "_" + ch, _x, _y, _w, _h, "⏎", () => decisionChoice(pre, ch));
					} else if (ch === "#") {
						createButton(pre + "_" + ch, _x, _y, _w, _h, "⇒", () => decisionChoice(pre, ch));
					} else if (ch === "゜") {
						let btn = createButton(pre + "_" + ch, _x, _y, _w, _h, "°/小", () => decisionChoice(pre, ch));
						btn.textSize = 40;
						btn.useAutoReturn = false;
					} else {
						createButton(pre + "_" + ch, _x, _y, _w, _h, ch, () => decisionChoice(pre, ch));
					}
				}
			}
		}
		function delKey(pre, kb) {
			let blankCou = 0;
			for (let i = 0, li = kb.length; i < li; i++) {
				let _ky = kb[i];
				for (let j = 0, lj = _ky.length; j < lj; j++) {
					let ch = _ky[j];
					if (ch === "_") {
						deadObj(pre + "Blank_" + blankCou);
						blankCou++;
						continue;
					} else {
						deadObj(pre + "_" + ch);
					}
				}
			}
		}

		function resetKey() {
			switch (oldJson?.keyType) {
				case "choice":
					for (let i = 0; i < 4; i++) {
						deadObj("choice_" + i);
					}
					break;
				case "keyAlp":
					delKey("keyAlp", keyboard.alp);
					break;
				case "keyNum":
					delKey("keyNum", keyboard.num);
					break;
				case "keyHira":
					delKey("keyHira", keyboard.hira1);
					delKey("keyHira", keyboard.hira2);
					break;
				case "keyKata":
					delKey("keyKata", keyboard.kata1);
					delKey("keyKata", keyboard.kata2);
					break;
			}
			deadObj("question");
			deadObj("timer");
		}
	}

	async function decisionChoice(type, json) {
		if (disableBtnFlag || json == null) {
			return;
		}
		disableBtnFlag = true;
		oldJson = json;

		switch (type) {
			case "genre":
				dispType = "quizNumber";
				nowJson = null;
				break;
			case "choice":
				await checkAnswer(type, json);
				break;
			case "keyAlp":
			case "keyNum":
				if (json === "$") {
					await checkAnswer(type, keyInputCache.join(""));
				} else if (json === "!") {
					if (keyInputCache.length > 0) {
						keyInputCache.pop();
					}
				} else {
					if (nowJson.ansLen > keyInputCache.length) {
						keyInputCache.push(json);
					}
				}
				break;
			case "keyHira":
			case "keyKata":
				if (json === "$") {
					await checkAnswer(type, keyInputCache.join(""));
				} else if (json === "#") {
					if (dispType == "answerChoice_sub") {
						dispType = "answerChoice";
					} else {
						dispType = "answerChoice_sub";
					}
				} else if (json === "!") {
					if (keyInputCache.length > 0) {
						keyInputCache.pop();
					}
				} else if (json === "゛") {
					// 濁点付与(解除)
					if (keyInputCache.length > 0) {
						let ind = keyInputCache.length - 1;
						let ch = keyInputCache[ind];
						if (ch in dakutenMap) {
							keyInputCache[ind] = dakutenMap[ch];
						} else if (ch in reverseDakutenMap) {
							keyInputCache[ind] = reverseDakutenMap[ch];
						} else if (ch in handakuten2dakutenMap) {
							keyInputCache[ind] = handakuten2dakutenMap[ch];
						}
					}
				} else if (json === "゜") {
					// 半濁点する(解除)
					if (keyInputCache.length > 0) {
						let ind = keyInputCache.length - 1;
						let ch = keyInputCache[ind];
						if (ch in handakutenMap) {
							keyInputCache[ind] = handakutenMap[ch];
						} else if (ch in reverseHandakutenMap) {
							keyInputCache[ind] = reverseHandakutenMap[ch];
						} else if (ch in dakuten2handakutenMap) {
							keyInputCache[ind] = dakuten2handakutenMap[ch];
						}
					}
				} else {
					if (nowJson.ansLen > keyInputCache.length) {
						keyInputCache.push(json);
					}
				}
				break;
			default:
				ccLog.error(`type: ${type} は存在しません`);
		}
		disableBtnFlag = false;
	}

	// 解答確認
	async function checkAnswer(type, ans) {
		if (!nowJson) {
			ccLog.error("nowJsonの消失");
			return;
		}
		try {
			drawObjDict["timer"]?.stop();
			let retJson = await loopGetJson("answer", {
				choiceIndex: nowJson.index,
				answer: ans,
				evaluation: drawObjDict["timer"]?.getEvaluation() ?? "__TIME_OVER__",
			});
			oldJson = retJson;
			keyInputCache = [];
			oldJson.keyType = type;
			dispType = "result";
		} catch (e) {
			ccLog.error(e);
		}
		nowJson = null;
	}

	// タイムオーバー
	async function timeOver() {
		disableBtnFlag = true;
		let kt = "choice";
		switch (nowJson?.write) {
			case 1:
				kt = "keyAlp";
				break;
			case 2:
				kt = "keyNum";
				break;
			case 3:
				kt = "keyHira";
				break;
			case 4:
				kt = "keyKata";
				break;
		}
		await checkAnswer(kt, "__NULL__");
	}

	// 文字表示アニメーション用
	function* typewriteText(text) {
		for (let i = 0; i < text.length; i++) {
			yield text.slice(0, i + 1);
			if (dispType == "result") break;
		}
		while (true) {
			yield text;
		}
	}
	// ユーザー入力表示用
	function* outDispInput(max = 0, type = 1) {
		let p = "";
		switch (type) {
			case 1:
			case 2:
				p = "_";
				break;
			case 3:
			case 4:
				p = "＿";
				break;
		}
		let cache = "";
		while (true) {
			if (!disableBtnFlag) {
				cache = keyInputCache.join("").padEnd(max, p);
			}
			yield cache;
		}
	}
}
