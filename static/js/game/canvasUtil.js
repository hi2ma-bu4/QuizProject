const FONT = `sans-serif`;
//const FONT = `"Meiryo UI", Meiryo`;

// ctx頒布用
class DrawObj {
	static ctx = null;

	dead = false;

	update() {}

	draw() {}

	isInside(x, y) {
		return this.x <= x && x <= this.x + this.w && this.y <= y && y <= this.y + this.h;
	}
}

// 背景
class BackGround extends DrawObj {
	constructor(x, y, w, h, img) {
		super();
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.img = img;
	}

	draw() {
		const ctx = Box.ctx;

		ctx.globalAlpha = 1;
		ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
	}
}

// map用のノード
class MapNode extends DrawObj {
	static maxWidthCou = 0;
	static maxHeightCou = 0;

	isNext = false;
	anim = 0;
	animFlag = false;
	animScale = 1;

	constructor(r, c, img, callBack = null) {
		super();
		this.r = r;
		this.c = c;
		this.img = img;

		this.callBack = callBack;

		this.w = this.img.width;
		this.h = this.img.height;
	}

	update() {
		if (this.animFlag) {
			this.anim--;
			if (this.anim <= 20) this.animFlag = false;
		} else {
			this.anim++;
			if (this.anim > 60) this.animFlag = true;
		}
	}

	draw() {
		const ctx = Box.ctx;

		const baseW = cw / (MapNode.maxWidthCou + 1);
		this.x = baseW * (this.c + 1);
		this.y = (ch / (MapNode.maxHeightCou + 1)) * (this.r + 1);
		if (this.r % 2 == 1) {
			this.x += baseW / 2;
		}

		const w = this.w * this.animScale;
		const h = this.h * this.animScale;

		this.x -= w / 2;
		this.y -= h / 2;

		if (this.isNext) {
			ctx.globalAlpha = this.anim / 60;
		} else {
			ctx.globalAlpha = 1;
		}
		ctx.drawImage(this.img, this.x, this.y, w, h);
	}

	click() {
		if (this.isNext) {
			this.callBack?.();
		}
	}

	hover(flag) {
		if (!this.isNext) {
			return;
		}
		if (flag) {
			this.animScale = 1.2;
		} else {
			this.animScale = 1;
		}
	}
}

// map用のプレイヤーピン
class NodePlayer extends MapNode {
	constructor(r, c, img) {
		super(r, c, img);
	}

	update() {
		if (!this.animFlag) {
			if (this.anim < 60) {
				this.anim++;
				if (this.anim > 30) {
					this.animScale = (this.anim - 30) / 30;
				} else {
					this.animScale = 0;
				}
			} else {
				this.animFlag = true;
				this.anim = 0;
			}
		}
	}

	click() {}
	hover() {}
}

// map用のノード線
class MapNodeLine extends DrawObj {
	constructor(rs, cs, re, ce) {
		super();
		this.rs = rs;
		this.cs = cs;
		this.re = re;
		this.ce = ce;
	}

	draw() {
		const ctx = Box.ctx;

		const baseW = cw / (MapNode.maxWidthCou + 1);
		const baseH = ch / (MapNode.maxHeightCou + 1);
		let xs = baseW * (this.cs + 1);
		let ys = baseH * (this.rs + 1);
		let xe = baseW * (this.ce + 1);
		let ye = baseH * (this.re + 2);
		if (this.rs % 2 == 1) {
			xs += baseW / 2;
		}
		if (this.re % 2 == 0) {
			xe += baseW / 2;
		}

		ctx.globalAlpha = 1;
		ctx.strokeStyle = "black";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(xs | 0, ys | 0);
		ctx.lineTo(xe | 0, ye | 0);
		ctx.stroke();
	}
}

// 敵
class Enemy extends DrawObj {
	textSize = 30;

	anim = 0;

	constructor(pos, opt = {}) {
		super();
		this.pos = pos;
		this.opt = {};
		for (const [key, value] of Object.entries(opt)) {
			this.opt[key] = value;
		}

		if (fontBaseMagnification == 1) {
			this.baseSize = 1;
			this.baseFontSize = 1;
			this.posDiff = 0;
		} else {
			this.baseSize = 0.45;
			this.baseFontSize = 0.6;
			this.posDiff = 20;
		}

		this.img = this.opt.image;
		this.w = this.img.width * this.opt.size * this.baseSize;
		this.h = this.img.height * this.opt.size * this.baseSize;

		this.hp_bar = new HPBar(this.opt.hp, this.opt.maxHp);
	}

	draw() {
		const ctx = Box.ctx;
		let x = 0,
			y = 0;
		switch (this.pos) {
			case "left":
				x = (cw - this.w) / 8 + this.posDiff / 2;
				y = ((ch / 8) * 3 - this.h) / 2 - 30;
				break;
			case "center":
				x = (cw - this.w) / 2;
				y = ((ch / 8) * 3 - this.h) / 2 + this.posDiff * 5;
				break;
			case "right":
				x = ((cw - this.w) * 7) / 8 - this.posDiff / 2;
				y = ((ch / 8) * 3 - this.h) / 2 - 30;
				break;
		}
		y -= 50;

		this.x = x;
		this.y = y;

		ctx.globalAlpha = 1;

		if (this.hp_bar.hp <= 0) {
			if (this.anim > 60) {
				this.dead = true;
				return;
			}
			ctx.globalAlpha = 1 - this.anim / 60;
			y += this.anim;
			if (this.anim % 2) {
				x += 5;
			}
			this.anim++;
		}

		ctx.drawImage(this.img, x, y, this.w, this.h);

		if (this.anim > 0) {
			return;
		}

		// 文字サイズ
		const fSize = this.textSize * this.baseFontSize;

		// 名前表示
		ctx.font = `bold ${fSize}px ${FONT}`;
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 30;
		ctx.textAlign = "center";
		ctx.strokeText(this.opt.name, x + this.w / 2, y + this.h + 20);
		ctx.fillStyle = "#fff";
		ctx.fillText(this.opt.name, x + this.w / 2, y + this.h + 20);

		// hp bar表示
		this.hp_bar.draw(x, y + this.h + 65, this.w);
	}
}

// 敵のhpバー
class HPBar extends DrawObj {
	h = 5;

	constructor(hp = 1, maxHp = 1) {
		super();
		this.hp = hp;
		this.maxHp = maxHp;
	}

	draw(x, y, w) {
		const ctx = Box.ctx;

		ctx.globalAlpha = 1;

		ctx.fillStyle = "#aaa";
		ctx.fillRect(x - 5, y - 5, w + 10, this.h + 10);

		ctx.fillStyle = "#000";
		ctx.fillRect(x, y, w, this.h);

		ctx.fillStyle = "#f00";
		ctx.fillRect(x, y, w * (this.hp / this.maxHp), this.h);
	}

	setHp(hp) {
		const diff = this.hp - hp;
		if (hp < 0) hp = 0;
		this.hp = hp;
		return diff;
	}
}

// 攻撃エフェクト
class AttackEffect extends DrawObj {
	anim = 0;

	constructor(x, y, size, opt = {}) {
		super();
		this.x = x;
		this.y = y;
		this.size = size;
		this.img = opt.img;
		this.imgXc = opt.fwc;
		this.imgYc = opt.fhc;

		this.speed = opt.speed;

		this.frame = 0;
		this.frameW = this.img.width / this.imgXc;
		this.frameH = this.img.height / this.imgYc;
	}

	update() {
		this.anim++;
		if (this.anim % this.speed == 0) {
			this.frame++;
			if (this.frame >= this.imgXc * this.imgYc) {
				this.dead = true;
			}
		}
	}

	draw() {
		const ctx = Box.ctx;
		ctx.globalAlpha = 1;

		ctx.drawImage(this.img, this.frameW * (this.frame % this.imgXc), this.frameH * ((this.frame / this.imgXc) | 0), this.frameW, this.frameH, this.x, this.y, this.size, this.size);
	}
}

// アイテム(ボツ)
class Item extends DrawObj {
	imageSize = 80;

	constructor(pos, opt = {}) {
		super();
		this.pos = pos;
		this.opt = {};
		for (const [key, value] of Object.entries(opt)) {
			this.opt[key] = value;
		}

		this.img = this.opt.image;
	}

	draw() {
		const ctx = Box.ctx;

		let x = cw - this.imageSize,
			y = (this.imageSize + 5) * (this.pos - 1);

		// 背景
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = "#000";
		ctx.fillRect(x, y, this.imageSize, this.imageSize);

		ctx.globalAlpha = 1;

		// 画像描画
		ctx.drawImage(this.img, x, y, this.imageSize, this.imageSize);
	}
}

// ダメージポップアップ
class Popup extends DrawObj {
	anim = 0;
	animFlag = false;
	opacity = 1;

	constructor(type, x, y, text, color) {
		super();
		this.type = type;
		this.x = x;
		this.y = y;
		this.text = text;
		this.color = color;
	}

	update() {
		switch (this.type) {
			case "up":
				this.anim++;
				if (this.anim > 30) {
					this.opacity = 1 - (this.anim - 30) / 30;
				}
				if (this.anim > 60) this.dead = true;
				break;
			case "jump":
				break;
		}
	}

	draw() {
		if (this.dead) return;
		const ctx = Box.ctx;

		const x = this.x;
		const y = this.y - this.anim;

		const fSize = this.textSize * fontBaseMagnification;
		ctx.font = `bold ${fSize}px ${FONT}`;

		ctx.globalAlpha = this.opacity;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillStyle = this.color;

		ctx.fillText(this.text, x, y);
	}
}

// 何でも使える箱
class Box extends DrawObj {
	opacity = 1;
	bgColor = "#604020";
	bdColor = "#D48D46";
	fgColor = "#ffffff";
	textSize = 40;

	useAutoReturn = true;

	constructor(x, y, w, h, text = "", textType = "genre", opt = {}) {
		super();
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.text = text;
		this.textType = textType;

		this.opt = opt;

		if (typeof this.text === "object") {
			this.textFunc = this.text;
			this.text = "";
		}
	}

	update() {
		if (this.textFunc) {
			this.text = this.textFunc.next().value;
		}
	}

	draw() {
		if (this.dead) return;
		const ctx = Box.ctx;
		const x = this.x + 1;
		const y = this.y + 1;
		const w = this.w - 2;
		const h = this.h - 2;

		ctx.globalAlpha = this.opacity;

		// ウィンドウ描画
		ctx.fillStyle = this.bgColor;
		ctx.fillRect(x, y, w, h);

		const d = 10;
		const d2 = d * 2;
		const d3 = d * 3;
		const d4 = d * 4;
		ctx.strokeStyle = this.bdColor;

		let tx = 0,
			ty = 0;
		switch (this.textType) {
			case "genre":
			case "genreQuestion":
			case "questionNumber":
			case "question":
			case "inputText":
			case "answer":
			case "choice":
			case "keyAlp":
			case "keyNum":
			case "keyHira":
			case "keyKata":
				// 枠描画
				ctx.lineWidth = 5;
				ctx.strokeRect(x + d2 - 1, y + d2 - 1, w - d4 + 2, h - d4 + 2);

				ctx.lineWidth = 3;
				ctx.strokeRect(x + d, y + d, d2, d2);
				ctx.strokeRect(x + w - d3, y + d, d2, d2);
				ctx.strokeRect(x + d, y + h - d3, d2, d2);
				ctx.strokeRect(x + w - d3, y + h - d3, d2, d2);

				tx = x + d3 + d / 2;
				ty = y + d3 + d / 2;
				break;
			default:
		}
		// 文字描画
		if (this.text == null || this.text == "") return;
		const fSize = this.textSize * fontBaseMagnification;

		let text = this.text;
		if (this.textType == "question") {
			text = "［問題］" + text;
		}
		let textArr;
		if (this.useAutoReturn) {
			textArr = AutoReturn.run(text, w - d4 - d3, (fSize * 0.9) | 0);
		} else {
			textArr = [text];
		}

		switch (this.textType) {
			case "question":
				ctx.textAlign = "left";
				ctx.textBaseline = "top";
				break;
			case "genre":
			case "genreQuestion":
			case "questionNumber":
			case "inputText":
			case "answer":
			case "keyAlp":
			case "keyNum":
			case "keyHira":
			case "keyKata":
			case "keyBlank":
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				tx = x + w / 2;
				ty = y + h / 2;
				break;
			case "choice":
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				ty = y + h / 2;
				break;
		}

		ctx.fillStyle = this.fgColor;
		ctx.font = `${fSize}px ${FONT}`;
		for (let i = 0; i < textArr.length; i++) {
			ctx.fillText(textArr[i], tx, ty + i * fSize, w - d4 - d3);
		}
		if (this.textType === "genre") {
			ctx.textAlign = "top";
			ctx.textBaseline = "left";
			ctx.font = `${(fSize * 0.7) | 0}px ${FONT}`;
			ctx.fillText("Lv" + this.opt.level, x + d4 * 2, y + d4 + d2);

			let write = "";
			switch (this.opt.write) {
				case 0:
					write = "4択";
					break;
				case 1:
				case 2:
				case 3:
				case 4:
					write = "記入";
					break;
				default:
					ccLog.log("write: " + this.opt.write);
					write = "???";
			}

			ctx.textBaseline = "right";
			ctx.fillText(write, x + w - d4 * 2 - d, y + d4 + d2);
		} else if (this.textType === "answer") {
			ctx.textAlign = "top";
			ctx.font = `${(fSize * 0.7) | 0}px ${FONT}`;
			ctx.fillText("[解答]", x + w / 2, y + d4 + d2, w - d4 - d3);
		}
	}
}

// クリック用のボタン
class Button extends Box {
	textSize = 80;

	constructor(x, y, w, h, text, textType, callBack, opt = {}) {
		super(x, y, w, h, text, textType, opt);
		this.callBack = callBack ?? function () {};
	}

	click() {
		this.callBack?.(this);
	}

	hover(flag) {
		if (flag) {
			this.opacity = 0.7;
		} else {
			this.opacity = 1;
		}
	}
}

// 文字
class Text extends DrawObj {
	fgColor = "#00ff00";

	textSize = 30;

	constructor(x, y, w, h, text, opt = {}) {
		super();
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.text = text;
		this.opt = opt;
	}

	draw() {
		const ctx = Box.ctx;

		ctx.globalAlpha = 1;

		// 文字描画
		ctx.fillStyle = this.fgColor;
		ctx.font = `${this.textSize}px ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 2);
	}
}

// 制限時間
class TimeBar extends DrawObj {
	bgColor = "#000000";
	fgColor = "#00ff00";
	_md4FgColor = "#0000aa";
	_5sFgColor = "#ffaa00";
	_3sFgColor = "#ff0000";

	textColor = "#ffffff";
	textSize = 30;

	_over = false;
	_timerStop = false;

	time = 0;

	constructor(x, y, w, h, maxTime = 20000, opt = {}) {
		super();
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;

		this.maxTime = maxTime;
		this.startTime = performance.now() + (opt.delay ?? 0);
		this.endTime = this.startTime + this.maxTime;

		this.opt = opt;
	}

	draw() {
		const ctx = Box.ctx;

		ctx.globalAlpha = 1;

		// 背景塗りつぶし
		ctx.fillStyle = this.bgColor;
		ctx.fillRect(this.x, this.y, this.w, this.h);

		if (!this._timerStop) {
			// 残り時間の割合
			this._nowTime = performance.now();
			this._timeRatio = 1 - (this._nowTime - this.startTime) / (this.endTime - this.startTime);
			// 残り時間
			this.time = (((this.endTime - this._nowTime) / 10) | 0) / 100;
			if (this._nowTime >= this.endTime) {
				this._timeRatio = 0;
				this.time = 0;

				if (!this._over) {
					this._over = true;
					this.opt.onOver?.();
				}
			}
		}
		if (this.time > 5) {
			if (this.time > (this.maxTime / 4000) * 3) {
				ctx.fillStyle = this._md4FgColor;
			} else {
				ctx.fillStyle = this.fgColor;
			}
		} else if (this.time > 3) {
			ctx.fillStyle = this._5sFgColor;
		} else {
			ctx.fillStyle = this._3sFgColor;
		}
		// 残り時間の色
		ctx.fillRect(this.x, this.y, this.w * this._timeRatio, this.h);
		// 残り時間表示
		const fSize = this.textSize * fontBaseMagnification - 4;
		ctx.strokeStyle = "black";
		ctx.fillStyle = this.textColor;
		ctx.lineWidth = 4;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		ctx.font = `bold ${fSize}px sans-serif`;
		let txt = `残り時間: ${this.time.toFixed(2)}s`;
		ctx.strokeText(txt, this.x + 2, this.y + 2);
		ctx.fillText(txt, this.x + 2, this.y + 2);
	}

	stop() {
		this._timerStop = true;
	}

	getEvaluation() {
		if (this._over) {
			return "__TIME_OVER__";
		}
		if (this.time > 5) {
			if (this.time > (this.maxTime / 4000) * 3) {
				return "Excellent";
			} else {
				return "Great";
			}
		} else if (this.time > 3) {
			return "Nice";
		} else {
			return "Good";
		}
	}
}

// 正解表示
class Correct extends DrawObj {
	anim = 0;

	constructor(x, y, r, evaluation) {
		super();
		this.x = x;
		this.y = y;
		this.r = r;
		this.evaluation = evaluation;
	}

	update() {
		this.anim++;
	}

	draw() {
		const ctx = Box.ctx;
		let outerRadius = (this.r / 2) | 0;
		let innerRadius = this.r;

		if (this.anim < 4) {
			outerRadius *= this.anim / 4;
			innerRadius *= this.anim / 4;
		}

		ctx.globalAlpha = 1;

		// 円描画
		ctx.beginPath();
		ctx.arc(this.x, this.y, outerRadius, 0, 2 * Math.PI);
		ctx.moveTo(this.x + innerRadius, this.y);
		ctx.arc(this.x, this.y, innerRadius, 0, 2 * Math.PI, true);
		ctx.closePath();

		ctx.fillStyle = "#dd6600";
		ctx.fill();
		ctx.lineWidth = 10;
		ctx.strokeStyle = "#dddd00";
		ctx.stroke();

		// 文字描画
		let fSize = this.r * 0.8;
		if (this.anim < 4) {
			fSize *= this.anim / 4;
		}
		ctx.font = `bold ${fSize | 0}px "ＭＳ 明朝", ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.lineWidth = 20;
		ctx.strokeStyle = "#ffff00";
		ctx.strokeText("正解", this.x, this.y);
		ctx.lineWidth = 10;
		ctx.strokeStyle = "#101010";
		ctx.strokeText("正解", this.x, this.y);
		ctx.fillStyle = "#ee0000";
		ctx.fillText("正解", this.x, this.y);

		// 評価描画
		fSize /= 3;
		ctx.font = `bold ${fSize | 0}px ${FONT}`;
		ctx.lineWidth = 10;
		ctx.strokeStyle = "#ffffff";
		ctx.strokeText(this.evaluation, this.x, this.y + innerRadius / 2 + 10);
		switch (this.evaluation) {
			case "Excellent":
				ctx.fillStyle = "#00ee00";
				break;
			case "Great":
				ctx.fillStyle = "#00eeee";
				break;
			case "Nice":
				ctx.fillStyle = "#aa00aa";
				break;
			case "Good":
				ctx.fillStyle = "#00ee";
				break;
			default:
				return;
		}
		ctx.fillText(this.evaluation, this.x, this.y + innerRadius / 2 + 10);
	}
}

// 不正解表示
class Incorrect extends DrawObj {
	anim = 0;

	constructor(x, y, r) {
		super();
		this.x = x;
		this.y = y;
		this.r = r;
	}

	update() {
		this.anim++;
	}

	draw() {
		const ctx = Box.ctx;
		let lineLength = (this.r * 0.7) | 0;

		if (this.anim < 4) {
			lineLength *= this.anim / 4;
		}

		ctx.globalAlpha = 1;

		let pl = 0;
		for (let i = 0; i <= 2; i++) {
			if (i == 0) {
				ctx.strokeStyle = "#999";
				pl = 20;
			} else {
				ctx.strokeStyle = "#0000ee";
				pl = 0;
			}
			ctx.lineWidth = 100 + pl * 2;
			if (this.anim < 4) {
				ctx.lineWidth *= this.anim / 4;
			}
			ctx.beginPath();
			ctx.moveTo(this.x - lineLength - pl, this.y - lineLength - pl);
			ctx.lineTo(this.x + lineLength + pl, this.y + lineLength + pl);
			ctx.moveTo(this.x + lineLength + pl, this.y - lineLength - pl);
			ctx.lineTo(this.x - lineLength - pl, this.y + lineLength + pl);
			ctx.stroke();
		}

		// 文字描画
		let fSize = this.r * 0.8;
		if (this.anim < 4) {
			fSize *= this.anim / 4;
		}
		ctx.font = `bold ${fSize | 0}px "UD デジタル 教科書体 NK-B", "UD Digi Kyokasho NK-B", "Tsukushi A Round Gothic", "筑紫A丸ゴシック", ${FONT}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.lineWidth = 30;
		ctx.strokeStyle = "#bbb";
		ctx.strokeText("不正解", this.x, this.y);
		ctx.lineWidth = 10;
		ctx.strokeStyle = "#101010";
		ctx.strokeText("不正解", this.x, this.y);
		ctx.fillStyle = "#0000ee";
		ctx.fillText("不正解", this.x, this.y);
	}
}

// クリア表示
class Clear extends DrawObj {
	anim = 0;

	static text = ["C    ", " L   ", "  E  ", "   A ", "    R"];
	wait = 6;

	constructor(x, y, r) {
		super();
		this.x = x;
		this.y = y;
		this.r = r;
	}

	update() {
		this.anim++;
	}

	draw() {
		const ctx = Box.ctx;
		let outerRadius = (this.r / 2) | 0;
		let innerRadius = this.r;

		ctx.globalAlpha = 1;

		// 文字描画
		for (let i = 0, li = Clear.text.length; i < li; i++) {
			let fSize = this.r * 0.8;
			if (this.anim < this.wait * (i + 1)) {
				if (this.wait * i < this.anim) {
					fSize *= (this.anim - this.wait * i) / this.wait;
				} else {
					fSize = 0;
				}
			}
			ctx.font = `bold ${fSize | 0}px "ＭＳ 明朝", ${FONT}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			let text = Clear.text[i];
			ctx.lineWidth = 20;
			ctx.strokeStyle = "#ffff00";
			ctx.strokeText(text, this.x, this.y);
			ctx.lineWidth = 10;
			ctx.strokeStyle = "#101010";
			ctx.strokeText(text, this.x, this.y);
			ctx.fillStyle = "#ee0000";
			ctx.fillText(text, this.x, this.y);
		}
	}
}

// 一定時間待機
class WaitObj extends DrawObj {
	anim = 0;

	constructor(func, wait = 1000) {
		super();
		this.func = func;
		this.wait = wait;
	}

	update() {
		this.anim++;
		if (this.anim > this.wait) {
			this.wait = Infinity;
			this.dead = true;
			this.func?.();
		}
	}
}

// 自動改行
class AutoReturn {
	static run(text, w, size) {
		if (text.length <= 1) {
			return [text];
		}
		const textArr = [];
		if (ctx.measureText) {
		}
		this.LfCou = (w / (size / 1.8)) | 0;

		let row = 0;
		let byteRest = this._ByteCount(text);
		textArr[0] = text;
		while (byteRest > this.LfCou) {
			var sliceNum = this._SliceCount(text);
			textArr[row] = text.slice(0, sliceNum);
			textArr[row + 1] = text.slice(sliceNum);

			text = textArr[row + 1];
			byteRest -= this.LfCou;
			row++;
		}
		return textArr;
	}
	static _ByteCount(string) {
		let byte = 0;
		for (let i = 0; i < string.length; i++) {
			if (string[i].match(/[ -~]/)) {
				byte += 1; //半角
			} else {
				byte += 2; //全角
			}
		}
		return byte;
	}
	static _SliceCount = (string) => {
		let count = 0;
		let byte = this.LfCou;
		for (let i = 0; byte > 0; i++) {
			if (string[i] == null) {
				break;
			}
			if (string[i].match(/[ -~]/)) {
				byte -= 1; //半角
			} else {
				byte -= 2; //全角
			}
			count++;
		}
		return count;
	};
}
