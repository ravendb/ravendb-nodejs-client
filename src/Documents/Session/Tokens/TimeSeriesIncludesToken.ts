import { QueryToken } from "./QueryToken";
import { TimeSeriesRange } from "../../Operations/TimeSeries/TimeSeriesRange";
import { StringUtil } from "../../../Utility/StringUtil";
import { DateUtil } from "../../../Utility/DateUtil";
import { StringBuilder } from "../../../Utility/StringBuilder";
import { AbstractTimeSeriesRange } from "../../Operations/TimeSeries/AbstractTimeSeriesRange";
import { TimeSeriesTimeRange } from "../../Operations/TimeSeries/TimeSeriesTimeRange";
import { throwError } from "../../../Exceptions";
import { TimeSeriesCountRange } from "../../Operations/TimeSeries/TimeSeriesCountRange";

export class TimeSeriesIncludesToken extends QueryToken {
    private _sourcePath: string;
    private readonly _range: AbstractTimeSeriesRange;

    private constructor(sourcePath: string, range: AbstractTimeSeriesRange) {
        super();

        this._range = range;
        this._sourcePath = sourcePath;
    }

    public static create(sourcePath: string, range: AbstractTimeSeriesRange) {
        return new TimeSeriesIncludesToken(sourcePath, range);
    }

    public addAliasToPath(alias: string) {
        this._sourcePath = StringUtil.isNullOrEmpty(this._sourcePath)
            ? alias
            : alias + "." + this._sourcePath;
    }

    writeTo(writer: StringBuilder) {
        writer
            .append("timeseries(");

        if (!StringUtil.isNullOrEmpty(this._sourcePath)) {
            writer
                .append(this._sourcePath)
                .append(", ");
        }

        if (StringUtil.isNullOrEmpty(this._range.name)) {
            writer
                .append("'")
                .append(this._range.name)
                .append("'")
                .append(", ");
        }

        if ("count" in this._range) {
            TimeSeriesIncludesToken.writeCountRangeTo(writer, this._range);
        } else if ("time" in this._range) {
            TimeSeriesIncludesToken.writeTimeRangeTo(writer, this._range);
        } else if ("from" in this._range && "to" in this._range) {
            TimeSeriesIncludesToken.writeRangeTo(writer, this._range);
        } else {
            throwError("InvalidArgumentException", "Not supported time range type: " + this._range);
        }

        writer
            .append(")");
    }

    private static writeTimeRangeTo(writer: StringBuilder, range: TimeSeriesTimeRange) {
        switch (range.type) {
            case "Last":
                writer
                    .append("last(");
                break;
            default:
                throwError("InvalidArgumentException", "Not supported time range type: " + range.type);
        }

        writer
            .append(range.time.value)
            .append(", '")
            .append(range.time.unit)
            .append("')");
    }

    private static writeCountRangeTo(writer: StringBuilder, range: TimeSeriesCountRange) {
        switch (range.type) {
            case "Last":
                writer
                    .append("last(");
                break;
            default:
                throwError("InvalidArgumentException", "Not supported time range type: " + range.type);
        }

        writer
            .append(range.count)
            .append(")");
    }

    private static writeRangeTo(writer: StringBuilder, range: TimeSeriesRange) {
        if (range.from) {
            writer
                .append("'")
                .append(DateUtil.utc.stringify(range.from))
                .append("'")
                .append(", ");
        } else {
            writer
                .append("null,");
        }

        if (range.to) {
            writer
                .append("'")
                .append(DateUtil.utc.stringify(range.to))
                .append("'");
        } else {
            writer
                .append("null");
        }
    }
}
