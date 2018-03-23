import * as path from "path";
import { debuglog } from "util";

const isDebug = !!process.env.NODE_DEBUG;

export interface ILogger {
    info(msg: string);
    error(errOrMsg: string | Error, additionalMsg?: string);
    warn(errOrMsg: string | Error, additionalMsg?: string);
}

export function getLogger({ name = "ravendb", filename = "" }): ILogger {
    const logName = filename
        ? path.basename(filename, ".js") 
        : name;
    if (!isDebug) {
        // tslint:disable-next-line:no-empty
        const noop = (msg: string) => {};
        return {
            error: noop,
            info: noop,
            warn: noop
        };
    }

    return new Logger(logName);
}

class Logger {

    private _logdebug: (msg: string) => void;

    constructor(name: string) {
        this._log = debuglog(name);
    }

    public error(errOrMsg: string | Error, additionalMsg?: string) {
        this._logWithError(errOrMsg, additionalMsg, "ERROR");
    }

    public warn(errOrMsg: string | Error, additionalMsg?: string) {
        this._logWithError(errOrMsg, additionalMsg, "WARN");
    }

    public info(msg) {
        this._log(`${msg}`, "INFO");
    }

    private _logWithError(err: string | Error, additionalMsg: string, level) {
        let msg: string = err && (err as Error).stack
            ? (err as Error).stack as string
            : err as string;
        if (additionalMsg) {
            msg = `${additionalMsg} ${msg}`;
        }

        this._log(`${msg}`, level);

    }

    private _log(msg, level = "INFO") {
        this._logdebug(`${new Date()} ${level}: ${msg}`);
    }
}
