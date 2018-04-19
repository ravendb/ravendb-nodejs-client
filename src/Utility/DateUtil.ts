import * as moment from "moment";
import { TypeUtil } from "./TypeUtil";

export class DateUtil {

    public static DEFAULT_DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSS0000";

    public static timestamp(): number {
        return moment().unix();
    }

    public static timestampMs(): number {
        return moment().valueOf();
    }

    public static zeroDate(): Date {
        return moment([1, 1, 1]).toDate();
    }

    public static parse(dateString: string): Date {
        if (!dateString) {
            return null;
        }
        
        const stripped = dateString.substring(0, dateString.length - 1);
        const format = this.DEFAULT_DATE_FORMAT;

        if (!dateString.endsWith("Z")) {
            const parsed = moment(dateString, format);

            if (parsed.isValid()) {
                return parsed.toDate();
            }
        }

        return moment(stripped, format).toDate();
    }

    public static stringify(date: Date): string {
        return moment(date).format(this.DEFAULT_DATE_FORMAT);
    }
}
