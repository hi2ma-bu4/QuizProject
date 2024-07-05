let slideIndex = 0;
let timer = null;

jasc.on("DOMContentLoaded", showSlides);

function showSlides() {
	if (timer) clearTimeout(timer);
	let slides = document.getElementsByClassName("mySlides");
	for (let i = 0; i < slides.length; i++) {
		slides[i].classList.remove("active");
	}
	slideIndex++;
	if (slideIndex > slides.length) {
		slideIndex = 1;
	} else if (slideIndex < 1) {
		slideIndex = slides.length;
	}
	slides[slideIndex - 1].classList.add("active");
	timer = setTimeout(showSlides, 3000);
}

function plusSlides(n) {
	slideIndex += n - 1;
	showSlides();
}
