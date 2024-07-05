const baseAttackEffectURL = "/img/attack/";

const attackEffectData = {
	通常攻撃1: {
		img: "Attack_Slash01_panop.png",
		fwc: 5,
		fhc: 1,
		speed: 4,
	},
	通常攻撃2: {
		img: "Attack_Slash02_panop.png",
		fwc: 8,
		fhc: 2,
		speed: 3,
	},
	通常攻撃3: {
		img: "Attack_Hit02_panop.png",
		fwc: 8,
		fhc: 2,
		speed: 4,
	},
	通常攻撃4: {
		img: "Magic_StarFall01_panop.png",
		fwc: 8,
		fhc: 3,
		speed: 2,
	},
};

const baseBackgroundURL = "/img/background/";

const backgroundData = {
	昼: "BackGround_sky1_pipo.jpg",
	夕焼け: "BackGround_sunset1_pipo.jpg",
	夜: "BackGround_night1_pipo.jpg",
	時空: "BackGround_space2_pipo.jpg",
};

// 先行読み込み
function dataLoader() {
	const pro = [];

	for (const [key, value] of Object.entries(attackEffectData)) {
		pro.push(
			new Promise((res, rej) => {
				const img = new Image();
				img.onload = () => {
					attackEffectData[key].img = img;
					res();
				};
				img.onerror = () => {
					rej();
				};
				img.src = baseAttackEffectURL + value.img;
			})
		);
	}

	for (const [key, value] of Object.entries(backgroundData)) {
		pro.push(
			new Promise((res, rej) => {
				const img = new Image();
				img.onload = () => {
					backgroundData[key] = img;
					res();
				};
				img.onerror = () => {
					rej();
				};
				img.src = baseBackgroundURL + value;
			})
		);
	}

	return Promise.all(pro);
}
