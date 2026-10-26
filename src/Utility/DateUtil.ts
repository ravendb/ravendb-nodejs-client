import { throwError } from "../Exceptions/index.js";
import { format, parse, parseISO } from "date-fns";

export interface DateUtilOpts {
    withTimezone?: boolean;
    useUtcDates?: boolean;
}

export class DateUtil {

    public static DEFAULT_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'0000'";
    public static DEFAULT_DATE_TZ_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'0000'xxx";

    public static default: DateUtil = new DateUtil({});

    public static utc: DateUtil = new DateUtil({ useUtcDates: true });
    public static tz: DateUtil = new DateUtil({ withTimezone: true });

    public constructor(protected opts: DateUtilOpts) {}

    public static timestamp(): number {
        return Math.floor(new Date().getTime() / 1000);
    }

    public static timestampMs(): number {
        return new Date().getTime();
    }

    public static zeroDate(): Date {
        return new Date(0);
    }

    public parse(dateString: string): Date {
        if (!dateString) {
            return null;
        }

        dateString = DateUtil.alignPrecision(dateString);
        let parsed: Date;
        if (this.opts.withTimezone) {
            parsed = parse(dateString, DateUtil.DEFAULT_DATE_TZ_FORMAT, new Date());
        } else if (this.opts.useUtcDates || dateString.endsWith("Z")) {
            if (!dateString.endsWith("Z")) {
                dateString += "Z";
            }
            parsed = parseISO(dateString);
        } else {
            parsed = DateUtil.parseLocalDate(dateString)
                ?? parse(dateString, DateUtil.DEFAULT_DATE_FORMAT, new Date());
        }

        if (isNaN(parsed.getTime())) {
            throwError("InvalidArgumentException", `Could not parse date string '${dateString}'.`);
        }

        return parsed;
    }

    private static readonly LOCAL_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})0000$/;

    // date-fns format-string parsing is ~10x slower; returns null (date-fns decides) for out-of-range or DST-gap values
    private static parseLocalDate(dateString: string): Date | null {
        const match = DateUtil.LOCAL_DATE_REGEX.exec(dateString);
        if (!match) {
            return null;
        }

        const [, year, month, day, hours, minutes, seconds, milliseconds] = match.map(Number);
        const date = new Date(0);
        date.setFullYear(year, month - 1, day);
        date.setHours(hours, minutes, seconds, milliseconds);

        const isExact = year > 0
            && date.getFullYear() === year
            && date.getMonth() === month - 1
            && date.getDate() === day
            && date.getHours() === hours
            && date.getMinutes() === minutes
            && date.getSeconds() === seconds;

        return isExact ? date : null;
    }

    private static alignPrecision(date: string) {
        const hasZ = date.endsWith("Z");
        if (hasZ) {
            date = date.slice(0, -1);
        }
        const lastDot = date.lastIndexOf(".");
        const tzPlusIndex = date.indexOf("+", lastDot);
        const tzMinusIndex = date.indexOf("-", lastDot);
        const tzIndex = Math.max(tzPlusIndex, tzMinusIndex);
        let tzSuffix = "";
        if (tzIndex !== -1) {
            tzSuffix = date.substring(tzIndex);
            date = date.slice(0, tzIndex - 1);
        }

        const suffix = "0000" + tzSuffix + (hasZ ? "Z" : "");

        if (lastDot === -1 || lastDot < date.length - 3) {
            return date.slice(0, lastDot + 4) + suffix;
        }
        return date + suffix;
    }

    public stringify(date: Date): string {
        if (this.opts.useUtcDates) {
            const utcString = date.toISOString().slice(0, -1);

            return this.opts.withTimezone ? utcString + "0000+00:00" : utcString + "0000Z";
        }
        if (this.opts.withTimezone) {
            return format(date, DateUtil.DEFAULT_DATE_TZ_FORMAT);
        }

        return DateUtil.formatLocalDate(date) ?? format(date, DateUtil.DEFAULT_DATE_FORMAT);
    }

    // same output as date-fns format(DEFAULT_DATE_FORMAT); null (date-fns decides) for invalid dates and years outside 0-9999
    private static formatLocalDate(date: Date): string | null {
        const year = date.getFullYear();
        if (!(year >= 0 && year <= 9999)) {
            return null;
        }

        const pad = (value: number, width = 2) => String(value).padStart(width, "0");
        return pad(year, 4) + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
            + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds())
            + "." + pad(date.getMilliseconds(), 3) + "0000";
    }

}
