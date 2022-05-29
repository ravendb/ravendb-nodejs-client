import { TimeValueUnit } from "./TimeValueUnit";
import { throwError } from "../Exceptions";
import { TypeUtil } from "../Utility/TypeUtil";
import { TimeValueRaw } from "../Documents/Operations/TimeSeries/RawTimeSeriesTypes";
import { StringBuilder } from "../Utility/StringBuilder";

export class TimeValue {

    private static readonly SECONDS_PER_DAY = 86_400;
    private static readonly SECONDS_IN_28_DAYS = 28 * TimeValue.SECONDS_PER_DAY; // lower-bound of seconds in month
    private static readonly SECONDS_IN_31_DAYS = 31 * TimeValue.SECONDS_PER_DAY; // upper-bound of seconds in month
    private static readonly SECONDS_IN_365_DAYS = 365 * TimeValue.SECONDS_PER_DAY; // lower-bound of seconds in a year
    private static readonly SECONDS_IN_366_DAYS = 366 * TimeValue.SECONDS_PER_DAY; // upper-bound of seconds in a year

    public static readonly ZERO = new TimeValue(0, "None");
    public static readonly MAX_VALUE = new TimeValue(TypeUtil.MAX_INT32, "None");
    public static readonly MIN_VALUE = new TimeValue(TypeUtil.MIN_INT32, "None");

    private _value: number;
    private _unit: TimeValueUnit;

    public get value() {
        return this._value;
    }

    public get unit() {
        return this._unit;
    }

    public constructor(value: number, unit: TimeValueUnit) {
        this._value = value;
        this._unit = unit;
    }

    public static ofSeconds(seconds: number) {
        return new TimeValue(seconds, "Second");
    }

    public static ofMinutes(minutes: number) {
        return new TimeValue(minutes * 60, "Second");
    }

    public static ofHours(hours: number) {
        return new TimeValue(hours * 3600, "Second");
    }

    public static ofDays(days: number) {
        return new TimeValue(days * TimeValue.SECONDS_PER_DAY, "Second");
    }

    public static ofMonths(months: number) {
        return new TimeValue(months, "Month");
    }

    public static ofYears(years: number) {
        return new TimeValue(years * 12, "Month");
    }

    private _append(builder: StringBuilder, value: number, singular: string) {
        if (value <= 0) {
            return;
        }

        builder
            .append(value.toString())
            .append(" ")
            .append(singular);

        if (value === 1) {
            builder
                .append(" ");
            return;
        }

        builder
            .append("s "); // lucky me, no special rules here
    }

    public toString() {
        if (this._value === TypeUtil.MAX_INT32) {
            return "MaxValue";
        }

        if (this._value === TypeUtil.MIN_INT32) {
            return "MinValue";
        }

        if (this._value === 0) {
            return "Zero";
        }

        if (this._unit === "None") {
            return "Unknown time unit";
        }

        const str = new StringBuilder();

        switch (this._unit) {
            case "Second": {
                let remainingSeconds = this._value;

                if (remainingSeconds > TimeValue.SECONDS_PER_DAY) {
                    const days = Math.floor(this._value / TimeValue.SECONDS_PER_DAY);
                    this._append(str, days, "day");
                    remainingSeconds -= days * TimeValue.SECONDS_PER_DAY;
                }

                if (remainingSeconds > 3_600) {
                    const hours = Math.floor(remainingSeconds / 3_600);
                    this._append(str, hours, "hour");
                    remainingSeconds -= hours * 3_600;
                }

                if (remainingSeconds > 60) {
                    const minutes = remainingSeconds / 60;
                    this._append(str, minutes, "minute");
                    remainingSeconds -= minutes * 60;
                }

                if (remainingSeconds > 0) {
                    this._append(str, remainingSeconds, "second");
                }
                break;
            }
            case "Month": {
                if (this._value >= 12) {
                    this._append(str, Math.floor(this._value / 12), "year");
                }
                if (this._value % 12 > 0) {
                    this._append(str, this._value % 12, "month");
                }
                break;
            }
            default:
                throwError("InvalidArgumentException", "Not supported unit: " + this._unit);
        }

        return str.toString().trim();
    }

    private _assertSeconds() {
        if (this._unit !== "Second") {
            throwError("InvalidArgumentException", "The value must be seconds");
        }
    }

    private static _assertValidUnit(unit: TimeValueUnit) {
        if (unit === "Month" || unit === "Second") {
            return;
        }

        throwError("InvalidArgumentException", "Invalid time unit: " + unit);
    }

    private static _assertSameUnits(a: TimeValue, b: TimeValue) {
        if (a.unit !== b.unit) {
            throwError("InvalidArgumentException", "Unit isn't the same " + a.unit + " != " + b.unit);
        }
    }

    public compareTo(other: TimeValue): number {
        if (!this._value || !other._value) {
            return this._value - other._value;
        }

        let result: number;
        if (TimeValue._isSpecialCompare(this, other, x => result = x)) {
            return result;
        }

        if (this._unit === other._unit) {
            return TimeValue._trimCompareResult(this._value - other._value);
        }

        const myBounds = TimeValue._getBoundsInSeconds(this);
        const otherBounds = TimeValue._getBoundsInSeconds(this);

        if (otherBounds[1] < myBounds[0]) {
            return 1;
        }

        if (otherBounds[0] > myBounds[1]) {
            return -1;
        }

        throwError("InvalidOperationException", "Unable to compare " + this + " with " + other + ", since a month might have different number of days.");
    }

    private static _getBoundsInSeconds(time: TimeValue): [number, number] {
        switch (time._unit) {
            case "Second":
                return [time._value, time._value];
            case "Month": {
                const years = Math.floor(time._value / 12);
                let upperBound = years * TimeValue.SECONDS_IN_366_DAYS;
                let lowerBound = years * TimeValue.SECONDS_IN_365_DAYS;

                const remainingMonths = time._value % 12;

                upperBound += remainingMonths * TimeValue.SECONDS_IN_31_DAYS;
                lowerBound += remainingMonths * TimeValue.SECONDS_IN_28_DAYS;

                return [lowerBound, upperBound];
            }
            default:
                throwError("InvalidArgumentException", "Not supported time value unit: " + time._unit);
        }
    }

    private static _isSpecialCompare(current: TimeValue, other: TimeValue, resultSetter: (x: number) => void): boolean {
        resultSetter(0);

        if (TimeValue._isMax(current)) {
            resultSetter(TimeValue._isMax(other) ? 0 : 1);
            return true;
        }

        if (TimeValue._isMax(other)) {
            resultSetter(TimeValue._isMax(current) ? 0 : -1);
            return true;
        }

        if (TimeValue._isMin(current)) {
            resultSetter(TimeValue._isMax(other) ? 0 : -1);
            return true;
        }

        if (TimeValue._isMin(other)) {
            resultSetter(TimeValue._isMax(current) ? 0 : 1);
            return true;
        }

        return false;
    }

    private static _isMax(time: TimeValue): boolean {
        return time._unit === "None" && time._value >= TypeUtil.MAX_INT32;
    }

    private static _isMin(time: TimeValue): boolean {
        return time._unit === "None" && time._value <= TypeUtil.MIN_INT32;
    }

    private static _trimCompareResult(result: number) {
        if (result > TypeUtil.MAX_INT32) {
            return TypeUtil.MAX_INT32;
        }

        if (result < TypeUtil.MIN_INT32) {
            return TypeUtil.MIN_INT32;
        }

        return result;
    }

    public serialize(): TimeValueRaw {
        return {
            Value: this.value,
            Unit: this.unit
        }
    }

    public static parse(raw: TimeValueRaw) {
        return new TimeValue(raw.Value, raw.Unit);
    }
}
