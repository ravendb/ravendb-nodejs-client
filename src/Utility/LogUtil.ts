import {debuglog} from "util";
import {printError} from "../Exceptions";

const isDebug = !!process.env.NODE_DEBUG;

export interface ILogger {
    info(msg: string);

    error(errOrMsg: string | Error, additionalMsg?: string);

    warn(errOrMsg: string | Error, additionalMsg?: string);
}

export function getLogger({name = "ravendb", module = ""}): ILogger {
    const logName = module ? `${name}-${module}` : name;
    if (!isDebug) {
        // tslint:disable-next-line:no-empty
        const noop = (msg: string) => {
        };
        return {
            error: noop,
            info: noop,
            warn: noop
        };
    }

    return new Logger(logName);
}

class Logger {

    private readonly _logdebug: (msg: string) => void;

    constructor(name: string) {
        this._logdebug = debuglog(name);
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
            ? printError(err as Error)
            : err as string;
        if (additionalMsg) {
            msg = `${additionalMsg} ${msg}`;
        }

        this._log(`${msg}`, level);

    }

    private _log(msg, level = "INFO") {
        const now = new Date();
        const dateString = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
            + ` ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        this._logdebug(`${dateString}|${level}: ${msg}`);
    }
}
