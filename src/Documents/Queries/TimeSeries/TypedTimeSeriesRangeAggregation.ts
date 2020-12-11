
export class TypedTimeSeriesRangeAggregation<T extends object> {
    public count: T;
    public max: T;
    public min: T;
    public last: T;
    public first: T;
    public average: T;
    public sum: T;
    public to: Date;
    public from: Date;
}
