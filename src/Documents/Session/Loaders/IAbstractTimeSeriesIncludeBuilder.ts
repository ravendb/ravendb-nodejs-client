import { TimeSeriesRangeType } from "../../Operations/TimeSeries/TimeSeriesRangeType";
import { TimeValue } from "../../../Primitives/TimeValue";

export interface IAbstractTimeSeriesIncludeBuilder<TBuilder> {

    includeTimeSeries(name: string, type: TimeSeriesRangeType, time: TimeValue): TBuilder;
    includeTimeSeries(name: string, type: TimeSeriesRangeType, count: number): TBuilder;

    includeTimeSeries(names: string[], type: TimeSeriesRangeType, time: TimeValue): TBuilder;
    includeTimeSeries(names: string[], type: TimeSeriesRangeType, count: number): TBuilder;

    includeAllTimeSeries(type: TimeSeriesRangeType, time: TimeValue): TBuilder;
    includeAllTimeSeries(type: TimeSeriesRangeType, count: number): TBuilder;

}