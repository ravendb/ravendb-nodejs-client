import { StringUtil } from "./StringUtil";

export class TimeUtil {

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
