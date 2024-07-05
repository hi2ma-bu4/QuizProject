function toggleMenu() {
	jasc.toggleClass("#menu-overlay", "active");
}

jasc.on("DOMContentLoaded", function () {
	jasc.acq("#menu-overlay").addEventListener("click", (e) => {
		if (e.target.id == "menu-overlay") {
			toggleMenu();
		}
	});
});

// ゲームを開始する
function loadGame(gameid) {
	const form = document.createElement("form");
	form.action = "/game/startup";
	form.method = "post";
	const input = document.createElement("input");
	input.type = "hidden";
	input.name = "gameid";
	input.value = gameid;
	form.style.display = "none";
	form.appendChild(input);
	document.body.appendChild(form);
	form.submit();
	form.remove();
}
