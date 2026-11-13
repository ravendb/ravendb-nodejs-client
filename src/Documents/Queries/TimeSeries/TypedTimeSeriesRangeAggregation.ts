
export class TypedTimeSeriesRangeAggregation<T extends object> {
    public count: T;
    public max: T;
    public min: T;
    public last: T;
    public first: T;
    public average: T;
    public sum: T;
    public percentile: number[];
    public slope: number[];
    public standardDeviation: number[];
    public key: unknown;
    public to: Date;
    public from: Date;
}
