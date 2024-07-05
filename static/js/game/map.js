{
	let dispType = "init",
		oldDispType = "__init__";

	let nowJson = null;

	jasc.on("DOMContentLoaded", async function () {
		jasc.on("gameFrameUpdate", update);
	});

	function update(isDraw = false, isOverFrame = false) {
		changeDisp();
	}

	async function changeDisp() {
		if (dispType === oldDispType) return;

		oldDispType = dispType;

		switch (dispType) {
			case "init":
				// 初期値
				dispType = "loadBG";
				break;
			case "loadBG":
				getImg("/img/background/parchment.jpg").then((img) => {
					drawObjDict["backGround"] = new BackGround(0, 0, cw, ch, img);
					dispType = "viewMap";
				});
				break;
			case "viewMap":
				nowJson = await loopGetJson("map");
				await drawMap(nowJson);
				break;

			case "end":
				createWait(() => {
					drawObjDict["clear"] = new Clear((cw / 2) | 0, (ch / 2) | 0, (Math.min(cw / 2, ch / 4) * 0.8) | 0);
					createWait(() => {
						moveNextMap("end");
					}, 60);
				}, 120);
		}
	}

	// map描画
	async function drawMap(json) {
		let plPos;
		[json, plPos] = json;
		let maxWidthCou = 0;
		for (let i = 0, li = (MapNode.maxHeightCou = json.length); i < li; i++) {
			if (json[i].length > maxWidthCou) {
				maxWidthCou = json[i].length;
			}
		}
		MapNode.maxWidthCou = maxWidthCou;

		{
			const title = new Text(cw / 2, 70, 0, 0, "MAP");
			title.fgColor = "#000000";
			title.textSize = 70;
			drawObjDict["title"] = title;
		}

		let nextStage = [];
		for (let i = 0, li = json.length; i < li; i++) {
			for (let j = 0, lj = json[i].length; j < lj; j++) {
				const node = json[i][j];
				for (let k = 0, lk = node.next.length; k < lk; k++) {
					const next = node.next[k];
					let [re, ce] = next.split("-");
					re = parseInt(re);
					if (ce) {
						ce = ce.charCodeAt(0) - 65;
					} else {
						ce = 0;
					}
					createNodeLine(`nodeLine_${node.id}_${next}`, li - i - 1, j, li - re - 1, ce);
				}
				const n = await createNode(node, li - i - 1, j, () => moveNextMap(node.id));
				if (nextStage.includes(node.id)) {
					n.isNext = true;
				}
				if (node.id === plPos) {
					drawObjDict["player"] = new NodePlayer(li - i - 1, j, await getImg("/img/map/icon119.png"));
					nextStage = node.next;
				}
			}
		}

		if (nextStage.length === 0) {
			dispType = "end";
		}
	}

	// node描画
	async function createNode(n, r, c, callBack = null) {
		return (drawObjDict["node_" + n.id] = new MapNode(r, c, await getImg(n.img), callBack));
	}

	// node線描画
	function createNodeLine(key, rs, cs, re, ce) {
		drawObjDict[key] = new MapNodeLine(rs, cs, re, ce);
	}

	// 次のステージへ移動
	function moveNextMap(id) {
		const form = document.createElement("form");
		form.action = "/game/map";
		form.method = "post";
		const input = document.createElement("input");
		input.type = "hidden";
		input.name = "mapid";
		input.value = id;
		form.style.display = "none";
		form.appendChild(input);
		document.body.appendChild(form);
		form.submit();
		form.remove();
	}
}
