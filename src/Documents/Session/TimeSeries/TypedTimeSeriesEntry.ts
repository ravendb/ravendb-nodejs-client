
export class TypedTimeSeriesEntry<T extends object> {
    public timestamp: Date;
    public tag: string;
    public values: number[];
    public rollup: boolean;
    public value: T;
}
