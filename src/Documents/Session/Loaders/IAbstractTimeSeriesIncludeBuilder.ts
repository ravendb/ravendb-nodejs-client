import { TimeSeriesRangeType } from "../../Operations/TimeSeries/TimeSeriesRangeType.js";
import { TimeValue } from "../../../Primitives/TimeValue.js";

export interface IAbstractTimeSeriesIncludeBuilder<TBuilder> {

    includeTimeSeries(name: string, type: TimeSeriesRangeType, time: TimeValue): TBuilder;
    includeTimeSeries(name: string, type: TimeSeriesRangeType, count: number): TBuilder;

    includeTimeSeries(names: string[], type: TimeSeriesRangeType, time: TimeValue): TBuilder;
    includeTimeSeries(names: string[], type: TimeSeriesRangeType, count: number): TBuilder;

    includeAllTimeSeries(type: TimeSeriesRangeType, time: TimeValue): TBuilder;
    includeAllTimeSeries(type: TimeSeriesRangeType, count: number): TBuilder;
    includeAllTimeSeries(from?: Date, to?: Date): TBuilder;

}