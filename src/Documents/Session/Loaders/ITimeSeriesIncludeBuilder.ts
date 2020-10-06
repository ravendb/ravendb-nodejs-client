
export interface ITimeSeriesIncludeBuilder<TBuilder> {
    includeTimeSeries(name: string): TBuilder;
    includeTimeSeries(name: string, from: Date, to: Date): TBuilder;
}
