let canvas, ctx;
let fontBaseMagnification = 1;

// キャンバスサイズ
let cw = 0,
	ch = 0;

let noMenu = false;
let statisticsView = false;

const drawObjDict = {};
{
	let parent;
	const loadTime = jasc.getTime();

	jasc.on("DOMContentLoaded", function () {
		// ゲーム画面でスリープにさせない
		const noSleep = new NoSleep();
		document.addEventListener(
			"click",
			function enableNoSleep() {
				document.removeEventListener("click", enableNoSleep, false);
				noSleep.enable();
				console.log("noSleep enabled");
			},
			false
		);
		parent = jasc.acq(".canvas-container")[0];
		canvas = jasc.acq("#canvas");

		ctx = canvas.getContext("2d");

		DrawObj.ctx = ctx;

		jasc.on("windowResize", changeSize);
		jasc.on("gameFrameUpdate", update);
		changeSize();

		fontBaseMagnification = canvas.width < 1000 ? 0.7 : 1;
		canvas.addEventListener("click", (e) => {
			const rect = canvas.getBoundingClientRect();
			const x = e.clientX * 2 - rect.x - rect.left;
			const y = e.clientY * 2 - rect.y - rect.top;

			for (let key in drawObjDict) {
				const obj = drawObjDict[key];
				if (obj.isInside(x, y)) {
					obj.click?.();
				}
			}
		});
		canvas.addEventListener("mousemove", cMove);
		canvas.addEventListener("touchmove", (e) => cMove(e.touches[0]));

		// ハンバーメニュー関連
		jasc.acq("#hamburger").addEventListener("click", toggleMenu);
	});

	function changeSize() {
		canvas.width = 1;
		canvas.height = 1;
		canvas.width = cw = parent.clientWidth * 2;
		canvas.height = ch = parent.clientHeight * 2;
	}

	// canvasMouseMoveEvent
	function cMove(e) {
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX * 2 - rect.x - rect.left;
		const y = e.clientY * 2 - rect.y - rect.top;
		for (let key in drawObjDict) {
			const obj = drawObjDict[key];
			obj.hover?.(obj.isInside(x, y));
		}
	}

	function update(isDraw = false, isOverFrame = false) {
		// オブジェクト内部処理
		for (let key in drawObjDict) {
			drawObjDict[key].update();
			if (drawObjDict[key].dead) {
				delete drawObjDict[key];
			}
		}

		// フレームスキップ
		if (!isDraw) {
			return;
		}

		ctx.clearRect(0, 0, cw, ch);

		// 背景色
		ctx.fillStyle = "#333";
		ctx.fillRect(0, 0, cw, ch);

		// オブジェクト描画
		for (let key in drawObjDict) {
			drawObjDict[key].draw();
			if (drawObjDict[key].dead) {
				delete drawObjDict[key];
			}
		}

		// 復元
		ctx.globalAlpha = 1;

		// fps表示
		{
			let color = "#9FEA4F";
			if (isOverFrame) {
				color = "#FF0000";
			}
			ctx.fillStyle = color;
			ctx.textBaseline = "top";
			ctx.textAlign = "left";
			ctx.font = `bold 20px 'px "太ゴシック","Arial Black", sans-serif`;
			ctx.fillText(`${jasc.readonly.nowFps}(${jasc.readonly.doFps})/${jasc.setting.gameFps}fps`, 0, 0);
		}

		// 高度な情報
		if (statisticsView) {
			let posY = 25;
			ctx.fillStyle = "#e0e0e0";
			ctx.fillText(jasc.formatDate(new Date(), "yyyy/MM/dd HH:mm:ss"), 0, posY);
			posY += 25;
			ctx.fillText(`staying: ${(((jasc.getTime() - loadTime) / 10) | 0) / 100}s`, 0, posY);
			posY += 25;
			ctx.fillText(`${jasc.readonly.os}(${jasc.readonly.browser})`, 0, posY);
			posY += 25;
			ctx.fillText(`isMobile: ${jasc.readonly.isMobile}`, 0, posY);
			posY += 25;
			ctx.fillText(`w/h: ${cw}/${ch}`, 0, posY);
			posY += 25;
			ctx.fillText(`drawObj: ${Object.keys(drawObjDict).length}`, 0, posY);
			posY += 25;
			ctx.fillText(`effect: ${effectListLen}`, 0, posY);
		}
	}
}

const _cache_img = new Map();
function getImg(url) {
	return new Promise((resolve) => {
		if (_cache_img.has(url)) {
			let ca = _cache_img.get(url);
			if (ca !== false) {
				resolve(ca);
				return;
			}
			setTimeout(waitImg, 100);
			return;
			function waitImg() {
				ca = _cache_img.get(url);
				if (ca !== false) {
					resolve(ca);
					return;
				}
				setTimeout(waitImg, 100);
			}
		}
		_cache_img.set(url, false);
		const img = new Image();
		img.src = url;
		img.onload = () => {
			_cache_img.set(url, img);
			resolve(img);
		};
	});
}

// ハンバーメニュー関連
function toggleStatistics() {
	statisticsView = !statisticsView;
}

function toggleMenu() {
	if (!noMenu) {
		jasc.toggleClass("#hamburger", "active");
		jasc.toggleClass("#hamburger-menu-overlay", "active");
	} else {
		jasc.acq("#hamburger").classList.remove("active");
		jasc.acq("#hamburger-menu-overlay").classList.remove("active");
	}
}

// オブジェクト...殺す...
function deadObj(key) {
	if (drawObjDict[key]) {
		drawObjDict[key].dead = true;
	}
}

// wait
function createWait(func, wait) {
	return Jasc.setAssociativeAutoName(drawObjDict, new WaitObj(func, wait), "wait");
}

// popup
function createPopup(type, x, y, text, color) {
	return Jasc.setAssociativeAutoName(drawObjDict, new Popup(type, x, y, text, color), "popup");
}

// effect
function createAttackEffect(x, y, size, opt = {}) {
	return Jasc.setAssociativeAutoName(drawObjDict, new AttackEffect(x, y, size, opt), "attackEffect");
}

// msgbox
function createBox(key, x, y, w, h, text, opt) {
	const textType = key.split("_")[0];
	return (drawObjDict[key] = new Box(x, y, w, h, text, textType, opt));
}

// buttonBox
function createButton(key, x, y, w, h, text, callBack, opt) {
	const textType = key.split("_")[0];
	return (drawObjDict[key] = new Button(x, y, w, h, text, textType, callBack, opt));
}

// timer
function createTimeBar(key, x, y, w, h, maxTime, opt) {
	return (drawObjDict[key] = new TimeBar(x, y, w, h, maxTime, opt));
}

// ajaxを安心して使用出来るやつ
function loopGetJson(name, opt = {}, count = 0, reCount = 0) {
	return new Promise((resolve, reject) => {
		getJson(name, opt)
			.then((data) => {
				if (data) {
					ccLog.log("接続成功");
					loadDisplay(false);
					resolve(data);
				} else {
					err();
				}
			})
			.catch((e) => {
				//console.warn(e);
				err(e);
			});
		function err(e) {
			ccLog.warn("接続失敗");
			switch (e.status) {
				case 204:
					alert("ゲームデータに接続出来ません。\n同期の為メニューページに戻ります。");
					location.href = "/game/menu";
					return;
				case 400:
					alert("リクエストに失敗しました。\nメニューページよりゲームを再開して下さい。");
					location.href = "/game/menu";
					return;
				case 401:
					alert("ログインセッションが切れています。\nログインし直して下さい。");
					location.href = "/login";
					return;
				case 409:
					alert("ゲームが他のページで進行しています。\n同期の為メニューページに戻ります。");
					location.href = "/game/menu";
					return;
			}
			if (count > 5) {
				let reCheck = false;
				if (reCount < 2) {
					reCheck = confirm("接続を維持出来ません。\n再度接続を試しますか？");
				} else {
					alert("接続を復帰出来ませんでした。\nメニューページに戻ります。");
				}
				if (reCheck) {
					loopGetJson(name, opt, (count / 2) | 0, reCount + 1).then(resolve, reject);
					return;
				}
				location.href = "/game/menu";
				// rejectせずに無限に待たせる
				// reject();
			} else {
				loadDisplay(true);
				loopGetJson(name, opt, count + 1, reCount).then(resolve, reject);
			}
		}
	});
}

// ユーザーに問題の重要性を伝える
function loadDisplay(flag) {
	const over = jasc.acq("#loading-overlay");
	if (flag) {
		over.classList.add("active");
	} else {
		over.classList.remove("active");
	}
}

// json取得
function getJson(name, opt = {}) {
	return new Promise((resolve, reject) => {
		jasc.ajax({
			url: `/api/${name}.json`,
			type: "POST",
			data: opt,
			timeout: 5000,
			success: (data) => {
				try {
					resolve(JSON.parse(data));
				} catch (e) {
					reject(e);
				}
			},
			error: (data) => {
				reject(data);
			},
		});
	});
}
