import { TimeSeriesQueryResult } from "./TimeSeriesQueryResult";
import { TimeSeriesRangeAggregation } from "./TimeSeriesRangeAggregation";
import { EntityConstructor } from "../../../Types";
import { TypedTimeSeriesAggregationResult } from "./TypedTimeSeriesAggregationResult";

export class TimeSeriesAggregationResult extends TimeSeriesQueryResult {
    public results: TimeSeriesRangeAggregation[];

    public asTypedEntry<T extends object>(clazz: EntityConstructor<T>) {
        const result = new TypedTimeSeriesAggregationResult<T>();
        result.count = this.count;
        result.results = this.results.map(x => x.asTypedEntry(clazz));
        return result;
    }
}
