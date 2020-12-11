import { TimeSeriesQueryResult } from "./TimeSeriesQueryResult";
import { TypedTimeSeriesEntry } from "../../Session/TimeSeries/TypedTimeSeriesEntry";

export class TypedTimeSeriesRawResult<TValues extends object> extends TimeSeriesQueryResult {
    public results: TypedTimeSeriesEntry<TValues>[];
}