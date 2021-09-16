import { IAbstractTimeSeriesIncludeBuilder } from "./IAbstractTimeSeriesIncludeBuilder";

export interface IGenericTimeSeriesIncludeBuilder<TBuilder> extends IAbstractTimeSeriesIncludeBuilder<TBuilder> {
    includeTimeSeries(name: string): TBuilder;
    includeTimeSeries(name: string, from: Date, to: Date): TBuilder;
}