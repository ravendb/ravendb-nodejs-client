export interface ICounterIncludeBuilder<TBuilder> {
    includeCounter(name: string): TBuilder;
    includeCounters(names: string[]): TBuilder;
    includeAllCounters(): TBuilder;
}