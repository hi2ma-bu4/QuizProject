const DEBUG = true;

// jasc初期設定
jasc.initSetting = {
	isGame: true,
};

jasc.setting = {
	logDebug: DEBUG,
};

var ccLog = jasc.consoleCustomLog({
	debug: DEBUG,
});

jasc.on("DOMContentLoaded", function () {
	lockScreenPortrait();
});

jasc.on("imageLoadError", function (e) {
	e.target.src = "/img/noimage.png";
});

window.addEventListener("orientationchange", function () {
	lockScreenPortrait();
});

document.addEventListener(
	"touchmove",
	function (event) {
		if (event.scale !== 1) {
			event.preventDefault();
		}
	},
	{ passive: false }
);

window.addEventListener("keydown", function (event) {
	if (event.ctrlKey) {
		if (event.key === ";" || event.key === "-" || event.key === "I") {
			event.preventDefault();
		}
	}
});

// スマートフォンの画面を縦向きにする
function lockScreenPortrait() {
	if (!jasc.readonly.isMobile) {
		return;
	}
	if (screen.orientation) {
		screen.orientation.lock("portrait");
	} else if (screen.mozLockOrientation) {
		screen.mozLockOrientation("portrait");
	} else if (screen.msLockOrientation) {
		screen.msLockOrientation("portrait");
	} else {
		// あきらめ
	}
	if (window.orientation === 90 || window.orientation === -90) {
		// 横向き
		//alert("画面を縦向きにしてください。");
		console.log("画面...横向き...コロス");
	}
}
