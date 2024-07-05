jasc.on("DOMContentLoaded", function () {
	const passwordInput1 = document.getElementById("password1");
	const passwordInput2 = document.getElementById("password2");

	const tooltip = document.getElementById("error-tooltip");

	passwordInput1.addEventListener("input", () => {
		const value = passwordInput1.value;
		const errors = [];

		if (!/(?=.*[a-z])/.test(value)) {
			errors.push("小文字のアルファベットが必要です");
		}
		if (!/(?=.*[A-Z])/.test(value)) {
			errors.push("大文字のアルファベットが必要です");
		}
		if (!/(?=.*\d)/.test(value)) {
			errors.push("数字が必要です");
		}
		if (!/[a-zA-Z\d]{8,}/.test(value)) {
			errors.push("8文字以上である必要があります");
		}
		if (/[^a-zA-Z\d]/.test(value)) {
			errors.push("アルファベットと数字以外の文字は使用できません");
		}

		if (errors.length > 0) {
			tooltip.style.display = "block";
			tooltip.innerHTML = "・" + errors.join("<br>・");
			tooltip.style.left = passwordInput1.offsetLeft + "px";
			tooltip.style.top = passwordInput1.offsetTop + passwordInput1.offsetHeight + 5 + "px";
		} else {
			tooltip.style.display = "none";
		}
	});

	passwordInput1.addEventListener("focus", () => {
		tooltip.style.display = "none";
	});

	passwordInput1.addEventListener("blur", () => {
		tooltip.style.display = "none";
	});

	passwordInput2.addEventListener("input", () => {
		const value = passwordInput2.value;
		if (value !== passwordInput1.value) {
			tooltip.style.display = "block";
			tooltip.innerHTML = "パスワードが一致しません";
			tooltip.style.left = passwordInput2.offsetLeft + "px";
			tooltip.style.top = passwordInput2.offsetTop + passwordInput2.offsetHeight + 5 + "px";
		} else {
			tooltip.style.display = "none";
		}
	});
});
