const fs = require("node:fs");

// ターミナルの色
class TerminalStyle {
	static RESET = "\x1b[0m";

	static BOLD = "\x1b[1m";
	static DIM = "\x1b[2m";
	static ITALIC = "\x1b[3m";
	static UNDERLINE = "\x1b[4m";
	static BLINK = "\x1b[5m";
	static STRIKE = "\x1b[9m";

	static NO_BOLD = "\x1b[21m";
	static NO_DIM = "\x1b[22m";
	static NO_ITALIC = "\x1b[23m";
	static NO_UNDERLINE = "\x1b[24m";
	static NO_BLINK = "\x1b[25m";
	static NO_STRIKE = "\x1b[29m";

	static FG_BLACK = "\x1b[30m";
	static FG_RED = "\x1b[31m";
	static FG_GREEN = "\x1b[32m";
	static FG_YELLOW = "\x1b[33m";
	static FG_BLUE = "\x1b[34m";
	static FG_MAGENTA = "\x1b[35m";
	static FG_CYAN = "\x1b[36m";
	static FG_WHITE = "\x1b[37m";

	static FG_DEFAULT = "\x1b[39m";

	static BG_BLACK = "\x1b[40m";
	static BG_RED = "\x1b[41m";
	static BG_GREEN = "\x1b[42m";
	static BG_YELLOW = "\x1b[43m";
	static BG_BLUE = "\x1b[44m";
	static BG_MAGENTA = "\x1b[45m";
	static BG_CYAN = "\x1b[46m";
	static BG_WHITE = "\x1b[47m";

	static BG_DEFAULT = "\x1b[49m";

	static FG_L_BLACK = "\x1b[90m";
	static FG_L_RED = "\x1b[91m";
	static FG_L_GREEN = "\x1b[92m";
	static FG_L_YELLOW = "\x1b[93m";
	static FG_L_BLUE = "\x1b[94m";
	static FG_L_MAGENTA = "\x1b[95m";
	static FG_L_CYAN = "\x1b[96m";
	static FG_L_WHITE = "\x1b[97m";

	static BG_L_BLACK = "\x1b[100m";
	static BG_L_RED = "\x1b[101m";
	static BG_L_GREEN = "\x1b[102m";
	static BG_L_YELLOW = "\x1b[103m";
	static BG_L_BLUE = "\x1b[104m";
	static BG_L_MAGENTA = "\x1b[105m";
	static BG_L_CYAN = "\x1b[106m";
	static BG_L_WHITE = "\x1b[107m";
}

// ログ
class Log {
	static #debugFlag = false;
	static _debugText = `${TerminalStyle.FG_MAGENTA}DEBUG${TerminalStyle.RESET}`;
	static _middleText = `${TerminalStyle.FG_L_BLUE}MIDDLE${TerminalStyle.FG_L_BLACK}${TerminalStyle.DIM}`;

	_wid;
	_widText;

	static setting(_debug) {
		this.#debugFlag = _debug;
	}

	static debug_log(...args) {
		if (this.#debugFlag) {
			this.log(this._debugText, ...args);
		}
	}

	static debug_warn(...args) {
		if (this.#debugFlag) {
			this.warn(this._debugText, ...args);
		}
	}

	static debug_err(...args) {
		if (this.#debugFlag) {
			this.err(this._debugText, ...args);
		}
	}

	static log(...args) {
		console.log(`${TerminalStyle.FG_L_BLACK}${Log.getTimeStr()}`, ...args, TerminalStyle.RESET);
	}

	static warn(...args) {
		console.warn(`${TerminalStyle.FG_YELLOW}${Log.getTimeStr()}`, ...args, TerminalStyle.RESET);
	}

	static err(...args) {
		console.error(`${TerminalStyle.FG_RED}${Log.getTimeStr()}`, ...args, TerminalStyle.RESET);
	}

	static getTimeStr() {
		return `[${new Date().toLocaleString()}]${TerminalStyle.RESET}`;
	}

	constructor(wid) {
		this._wid = wid;
		this._widText = `${TerminalStyle.FG_L_BLACK}[${this._wid}]${TerminalStyle.RESET}`;
	}

	debug_log(...args) {
		if (Log.#debugFlag) {
			this.log(Log._debugText, ...args);
		}
	}

	debug_warn(...args) {
		if (Log.#debugFlag) {
			this.warn(Log._debugText, ...args);
		}
	}

	debug_err(...args) {
		if (Log.#debugFlag) {
			this.err(Log._debugText, ...args);
		}
	}

	log(...args) {
		console.log(`${TerminalStyle.FG_L_BLACK}${Log.getTimeStr()}${this._widText}`, ...args, TerminalStyle.RESET);
	}

	warn(...args) {
		console.warn(`${TerminalStyle.FG_YELLOW}${Log.getTimeStr()}${this._widText}`, ...args, TerminalStyle.RESET);
	}

	err(...args) {
		console.error(`${TerminalStyle.FG_RED}${Log.getTimeStr()}${this._widText}`, ...args, TerminalStyle.RESET);
	}

	middle(...args) {
		this.log(Log._middleText, ...args);
	}
}

// 変換
class ConvertType {
	static toBool(str) {
		try {
			return !!JSON.parse(str.toLowerCase());
		} catch (e) {
			Log.debug_warn(e);
			return false;
		}
	}
}

// json汎用読み込み
class JsonLoad {
	static exists_cache = new Map();
	static cache = new Map();

	static isFileExists(filePath, noCache = false) {
		if (!noCache && this.exists_cache.has(filePath)) {
			return this.cache.get(filePath);
		}
		const exists = fs.existsSync(filePath);
		if (!noCache) {
			this.exists_cache.set(filePath, exists);
		}
		return exists;
	}

	static readFile(filePath, noCache = false) {
		if (!noCache && this.cache.has(filePath)) {
			return this.cache.get(filePath);
		}
		if (!JsonLoad.isFileExists(filePath, noCache)) {
			Log.debug_err("File Not Found: " + filePath);
			return false;
		}
		try {
			const data = fs.readFileSync(filePath, "utf8");
			const json = JSON.parse(data);
			if (!noCache) {
				this.cache.set(filePath, json);
			}
			return json;
		} catch (e) {
			Log.debug_err(e);
			return false;
		}
	}
}

// ##################################################
// 輸出
// ##################################################

module.exports = {
	// Class
	TerminalStyle,
	Log,
	ConvertType,
	JsonLoad,

	// Function
	isAssociative(obj) {
		return obj?.constructor === Object;
	},
};
