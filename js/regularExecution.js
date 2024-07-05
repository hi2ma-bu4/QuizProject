const cron = require("node-cron");

const { Log } = require("./lib/util");

const maxHeap = require("node:v8").getHeapStatistics().total_available_size;
let workerMemoryGetter = null;

cron.schedule(
	"0,30 * * * * *",
	() => {
		// 30秒毎実行
		if (workerMemoryGetter == null) {
			return;
		}

		workerMemoryGetter()
			.then((heapList) => {
				const heapUsed = process.memoryUsage().heapUsed + heapList.reduce((a, b) => a + b, 0);
				const nowUsePercent = (((heapUsed / maxHeap) * 1e3) | 0) / 1e3;

				Log.debug_log(`Heap:${heapUsed} bytes. (${((heapUsed / 1e4) | 0) / 100} MB) (${nowUsePercent}%)`);
			})
			.catch((e) => {
				Log.err(e);
			});
	},
	{
		timezone: "Asia/Tokyo",
	}
);

module.exports = {
	setWorkerMemoryGetter(callback) {
		workerMemoryGetter = callback;
	},
};
