import { TimeSeriesQueryResult } from "./TimeSeriesQueryResult";
import { TypedTimeSeriesRangeAggregation } from "./TypedTimeSeriesRangeAggregation";

export class TypedTimeSeriesAggregationResult<T extends object> extends TimeSeriesQueryResult {
    public results: TypedTimeSeriesRangeAggregation<T>[];
}