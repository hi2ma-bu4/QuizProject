let effectListLen = 0;
{
	//jasc.on("gameRequestAnimationFrame", () => {
	jasc.on("gameFrameUpdate", () => {
		effectListLen = effectList.length;
		for (let i = effectListLen - 1; i >= 0; i--) {
			const effect = effectList[i];
			effect.update();
			if (effect.dead) {
				effectList.splice(i, 1);
			}
		}
	});

	let effectInterval = null;
	function startEffectGeneration(x, y, cou = 2, life = 20) {
		if (effectInterval) {
			clearInterval(effectInterval);
			createEffect(x, y);
		} else {
			createEffect(x, y, 20, 30);
		}
		effectInterval = setInterval(() => createEffect(x, y, cou, life), 100);
	}

	function stopEffectGeneration() {
		if (effectInterval) {
			clearInterval(effectInterval);
			effectInterval = null;
		}
	}

	addEventListener("mousedown", (event) => {
		startEffectGeneration(event.clientX, event.clientY);
	});

	addEventListener("mouseup", () => {
		stopEffectGeneration();
	});

	addEventListener("mousemove", (event) => {
		if (effectInterval) {
			startEffectGeneration(event.clientX, event.clientY);
		}
	});

	addEventListener("touchstart", (event) => {
		for (const touch of event.touches) {
			startEffectGeneration(touch.clientX, touch.clientY, 4, 30);
		}
	});

	addEventListener("touchend", () => {
		stopEffectGeneration();
	});

	addEventListener("touchmove", (event) => {
		for (const touch of event.touches) {
			startEffectGeneration(touch.clientX, touch.clientY, 1, 25);
		}
	});

	const effectList = [];
	function createEffect(x, y, cou = 2, life = 20) {
		for (let i = 0; i < cou; i++) {
			if (effectList.length > 100) {
				effectList.shift().remove();
			}
			effectList.push(new Effect(x, y, life, "starEffect"));
		}
	}

	// キラキラクラス
	class Effect {
		dead = false;
		#element;
		#lifeFrame = 0;
		#maxLifeFrame = 0;

		#moveX = 0;
		#moveY = 0;

		constructor(x, y, lifeFrame = 100, className = "star") {
			this.x = x;
			this.y = y;

			this.#lifeFrame = lifeFrame;
			this.#maxLifeFrame = lifeFrame;

			// ランダムな角度を生成し、ラジアンに変換
			const angle = Math.random() * 2 * Math.PI;
			// 移動量を計算（速度を 2 に設定）
			const speed = Math.random() * 2;
			this.#moveX = Math.cos(angle) * speed;
			this.#moveY = Math.sin(angle) * speed;

			this.#element = document.createElement("div");
			this.#element.classList.add("effect");
			this.#element.classList.add(className);
			this.#element.style.left = this.x + "px";
			this.#element.style.top = this.y + "px";
			this.getPar().appendChild(this.#element);
			this.update();
		}
		update() {
			if (this.#lifeFrame < 0 || this.dead || this.isOutDisplay()) {
				this.remove();
				return;
			}
			this.#lifeFrame--;

			this.x += this.#moveX;
			this.y += this.#moveY;
			const style = this.#element.style;
			style.left = this.x + "px";
			style.top = this.y + "px";
			style.transform = `scale(${this.#lifeFrame / this.#maxLifeFrame})`;
		}

		getPar() {
			let effectBuffer = document.getElementById("effectBuffer");
			if (!effectBuffer) {
				effectBuffer = document.createElement("div");
				effectBuffer.id = "effectBuffer";
				document.body.appendChild(effectBuffer);
			}
			return effectBuffer;
		}

		isOutDisplay() {
			return this.x > window.innerWidth - 10 || this.y > window.innerHeight - 10 || this.x < 10 || this.y < 10;
		}

		remove() {
			if (!this.dead) {
				this.dead = true;
				this.#element.remove();
				return;
			}
		}
	}
	window.Effect = Effect;
}
