import { ClassConstructor } from "../../../Types/index.js";
import { TypedTimeSeriesRangeAggregation } from "./TypedTimeSeriesRangeAggregation.js";
import { TimeSeriesValuesHelper } from "../../Session/TimeSeries/TimeSeriesValuesHelper.js";

export class TimeSeriesRangeAggregation {
    public count: number[];
    public max: number[];
    public min: number[];
    public last: number[];
    public first: number[];
    public average: number[];
    public sum: number[];
    public percentile: number[];
    public slope: number[];
    public standardDeviation: number[];
    public key: unknown;
    public to: Date;
    public from: Date;

    public asTypedEntry<T extends object>(clazz: ClassConstructor<T>): TypedTimeSeriesRangeAggregation<T> {
        const typedEntry = new TypedTimeSeriesRangeAggregation<T>();

        typedEntry.from = this.from;
        typedEntry.to = this.to;
        typedEntry.min = this.min ? TimeSeriesValuesHelper.setFields(clazz, this.min, false) : null;
        typedEntry.max = this.max ? TimeSeriesValuesHelper.setFields(clazz, this.max, false) : null;
        typedEntry.first = this.first ? TimeSeriesValuesHelper.setFields(clazz, this.first, false) : null;
        typedEntry.last = this.last ? TimeSeriesValuesHelper.setFields(clazz, this.last, false) : null;
        typedEntry.sum = this.sum ? TimeSeriesValuesHelper.setFields(clazz, this.sum, false) : null;
        typedEntry.count = this.count ? TimeSeriesValuesHelper.setFields(clazz, this.count, false) : null;
        typedEntry.average = this.average ? TimeSeriesValuesHelper.setFields(clazz, this.average, false) : null;
        typedEntry.percentile = this.percentile;
        typedEntry.slope = this.slope;
        typedEntry.standardDeviation = this.standardDeviation;
        typedEntry.key = this.key;

        return typedEntry;
    }
}