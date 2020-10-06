import { QueryToken } from "./QueryToken";
import { TimeSeriesRange } from "../../Operations/TimeSeries/TimeSeriesRange";
import { StringUtil } from "../../../Utility/StringUtil";
import * as StringBuilder from "string-builder";
import { DateUtil } from "../../../Utility/DateUtil";

export class TimeSeriesIncludesToken extends QueryToken {
    private _sourcePath: string;
    private readonly _range: TimeSeriesRange;

    private constructor(sourcePath: string, range: TimeSeriesRange) {
        super();

        this._range = range;
        this._sourcePath = sourcePath;
    }

    public static create(sourcePath: string, range: TimeSeriesRange) {
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

        if (StringUtil.isNullOrEmpty(this._sourcePath)) {
            writer
                .append(this._sourcePath)
                .append(", ");
        }

        writer
            .append("'")
            .append(this._range.name)
            .append("'")
            .append(", ");

        if (this._range.from) {
            writer
                .append("'")
                .append(DateUtil.utc.stringify(this._range.from))
                .append("'")
                .append(", ");
        } else {
            writer
                .append("null,");
        }

        if (this._range.to) {
            writer
                .append("'")
                .append(DateUtil.utc.stringify(this._range.to))
                .append("'");
        } else {
            writer
                .append("null");
        }

        writer
            .append(")");
    }
}
