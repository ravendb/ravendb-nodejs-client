import { StringUtil } from "./StringUtil";
import { throwError } from "../Exceptions/index";

export class TimeUtil {

    private static _parseMiddlePart(input: string) {
        const tokens = input.split(":");
        const hours = parseInt(tokens[0], 10);
        const minutes = parseInt(tokens[1], 10);
        const seconds = parseInt(tokens[2], 10);

        if (tokens.length !== 3) {
            throwError("InvalidArgumentException", "Unexpected duration format: " + input);
        }

        const totalSeconds = seconds + minutes * 60 + hours * 3600;
        return totalSeconds * 1000;
    }

    public static readonly MILLIS_IN_DAY = 24 * 3600 * 1000;

    public static timeSpanToDuration(text: string) {
        const hasDays = !!text.match(/^\d+\./);
        const hasMillis = !!text.match(/.*\.\d+/);

        if (hasDays && hasMillis) {
            const tokens = text.split(".");

            const days = parseInt(tokens[0], 10);
            const millis = tokens[2] ? parseInt(tokens[2], 10) : 0;
            return this._parseMiddlePart(tokens[1]) + millis + days * TimeUtil.MILLIS_IN_DAY;
        } else if (hasDays) {
            const tokens = text.split(".");
            const days = parseInt(tokens[0], 10);
            return this._parseMiddlePart(tokens[1]) + days * TimeUtil.MILLIS_IN_DAY;
        } else if (hasMillis) {
            const tokens = text.split(".");
            let fractionString = tokens[1];
            fractionString = fractionString.padEnd(7, "0");
            const value = parseInt(fractionString, 10) / 10_000;
            return this._parseMiddlePart(tokens[0]) + value;
        } else {
            return this._parseMiddlePart(text);
        }
    }

    public static millisToTimeSpan(value: number): string {
        let time = value;
        const millis = time % 1000;
        time = (time - millis) / 1000; // seconds
        const seconds = time % 60;
        time = (time - seconds) / 60; // in minutes
        const minutes = time % 60;
        time = (time - minutes) / 60; // in hours
        const hours = time % 24;
        time = (time - hours) / 24;
        const days = time;

        let result = "";
        if (days) {
            result += days + ".";
        }

        result += StringUtil.leftPad(hours.toString(), 2, "0")
            + ":"
            + StringUtil.leftPad(minutes.toString(), 2, "0")
            + ":"
            + StringUtil.leftPad(seconds.toString(), 2, "0");

        if (millis) {
            result += "." + StringUtil.leftPad(millis.toString(), 3, "0") + "000";
        }

        return result;
    }
}
