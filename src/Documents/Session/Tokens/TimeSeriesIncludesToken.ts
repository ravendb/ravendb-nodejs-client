import { QueryToken } from "./QueryToken";
import { TimeSeriesRange } from "../../Operations/TimeSeries/TimeSeriesRange";
import { StringUtil } from "../../../Utility/StringUtil";
import { DateUtil } from "../../../Utility/DateUtil";
import { StringBuilder } from "../../../Utility/StringBuilder";
import { AbstractTimeSeriesRange } from "../../Operations/TimeSeries/AbstractTimeSeriesRange";

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
