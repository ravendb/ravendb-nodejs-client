import { TimeSeriesQueryResult } from "./TimeSeriesQueryResult";
import { TimeSeriesEntry } from "../../Session/TimeSeries/TimeSeriesEntry";
import { ClassConstructor } from "../../../Types";
import { TypedTimeSeriesRawResult } from "./TypedTimeSeriesRawResult";

export class TimeSeriesRawResult extends TimeSeriesQueryResult {
    public results: TimeSeriesEntry[];

    public asTypedResult<T extends object>(clazz: ClassConstructor<T>) {
        const result = new TypedTimeSeriesRawResult<T>();
        result.count = this.count;
        result.results = this.results.map(x => x.asTypedEntry(clazz));
        return result;
    }
}
