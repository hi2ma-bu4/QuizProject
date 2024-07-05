const net = require("node:net");
const os = require("node:os");

// 使えるポートを探す
function findAvailablePort(host, startPort) {
	return new Promise((resolve, reject) => {
		const server = net.createServer();

		server.once("error", (err) => {
			if (err.code !== "EADDRINUSE") {
				reject(err);
				return;
			}
			resolve(false);
		});

		server.once("listening", () => {
			server.close(() => {
				resolve(true);
			});
		});

		server.listen(startPort, host);
	});
}

// ローカルのIPを取得
function getLocalIP() {
	const interfaces = os.networkInterfaces();

	if ("Wi-Fi" in interfaces) {
		for (const interfaceInfo of interfaces["Wi-Fi"]) {
			if (interfaceInfo.family === "IPv4" && !interfaceInfo.internal) {
				return interfaceInfo.address;
			}
		}
	}
	for (const interfaceName in interfaces) {
		for (const interfaceInfo of interfaces[interfaceName]) {
			if (interfaceInfo.family === "IPv4" && !interfaceInfo.internal) {
				return interfaceInfo.address;
			}
		}
	}

	return null;
}

module.exports = { getLocalIP, findAvailablePort };
