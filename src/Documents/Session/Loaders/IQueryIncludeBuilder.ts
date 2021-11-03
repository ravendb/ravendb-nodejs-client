import { IGenericIncludeBuilder } from "./IGenericIncludeBuilder";
import { TimeSeriesRangeType } from "../../Operations/TimeSeries/TimeSeriesRangeType";
import { TimeValue } from "../../../Primitives/TimeValue";

export interface IQueryIncludeBuilder extends IGenericIncludeBuilder<IQueryIncludeBuilder> {

    includeCounter(name: string): IQueryIncludeBuilder;
    includeCounter(path: string, name: string): IQueryIncludeBuilder;

    includeCounters(names: string[]): IQueryIncludeBuilder;
    includeCounters(path: string, names: string[]): IQueryIncludeBuilder;

    includeAllCounters(): IQueryIncludeBuilder;
    includeAllCounters(path: string): IQueryIncludeBuilder;

    includeTimeSeries(path: string, name: string): IQueryIncludeBuilder;
    includeTimeSeries(path: string, name: string, from: Date, to: Date): IQueryIncludeBuilder;

    // parent merging start
    includeTimeSeries(name: string): IQueryIncludeBuilder;
    includeTimeSeries(name: string, from: Date, to: Date): IQueryIncludeBuilder;
    includeTimeSeries(name: string, type: TimeSeriesRangeType, time: TimeValue): IQueryIncludeBuilder;
    includeTimeSeries(name: string, type: TimeSeriesRangeType, count: number): IQueryIncludeBuilder;
    includeTimeSeries(names: string[], type: TimeSeriesRangeType, time: TimeValue): IQueryIncludeBuilder;
    includeTimeSeries(names: string[], type: TimeSeriesRangeType, count: number): IQueryIncludeBuilder;
    // parent merging end

}
