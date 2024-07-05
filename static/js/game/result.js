jasc.on("DOMContentLoaded", function () {
	const genreChart = jasc.acq("#genre_chart");

	const gs = {};
	const datasets = [
		{
			data: [],
			label: "正答数",
			borderWidth: 1,
		},
		{
			data: [],
			label: "問題数",
			borderWidth: 1,
		},
	];
	for (let i = 0, li = subjects.length; i < li; i++) {
		gs[subjects[i].genre] = {
			answer_count: subjects[i].answer_count,
			count: subjects[i].count,
		};
	}
	for (let i = 0, li = genres.length; i < li; i++) {
		datasets[0].data.push(gs[genres[i]]?.count ?? 0);
		datasets[1].data.push(gs[genres[i]]?.answer_count ?? 0);
	}
	new Chart(genreChart, {
		type: "bar",
		data: {
			labels: genres,
			datasets: datasets,
		},
		options: {
			scales: {
				y: {
					beginAtZero: true,
				},
			},
		},
	});
});
