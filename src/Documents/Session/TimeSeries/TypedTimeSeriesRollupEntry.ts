import { ClassConstructor } from "../../../Types";
import { TimeSeriesValuesHelper } from "./TimeSeriesValuesHelper";
import { TimeSeriesEntry } from "./TimeSeriesEntry";

export class TypedTimeSeriesRollupEntry<TValues extends object> {
    private _clazz: ClassConstructor<TValues>;

    public timestamp: Date;
    public tag: string;
    public rollup: boolean;

    private _first: TValues;
    private _last: TValues;
    private _max: TValues;
    private _min: TValues;
    private _sum: TValues;
    private _count: TValues;

    private _average: TValues;

    public constructor(clazz: ClassConstructor<TValues>, timestamp: Date) {
        this._clazz = clazz;
        this.rollup = true;
        this.timestamp = timestamp;
    }


    private createInstance(): TValues {
        return new this._clazz();
    }

    public get max(): TValues {
        if (!this._max) {
            this._max = this.createInstance();
        }

        return this._max;
    }

    public get min(): TValues {
        if (!this._min) {
            this._min = this.createInstance();
        }

        return this._min;
    }

    public get count(): TValues {
        if (!this._count) {
            this._count = this.createInstance();
        }

        return this._count;
    }

    public get first(): TValues {
        if (!this._first) {
            this._first = this.createInstance();
        }

        return this._first;
    }

    public get last(): TValues {
        if (!this._last) {
            this._last = this.createInstance();
        }

        return this._last;
    }

    public get sum(): TValues {
        if (!this._sum) {
            this._sum = this.createInstance();
        }

        return this._sum;
    }

    public get average(): TValues {
        if (this._average) {
            return this._average;
        }

        const valuesCount = TimeSeriesValuesHelper.getFieldsMapping(this._clazz).length;

        const sums = TimeSeriesValuesHelper.getValues(this._clazz, this._sum);
        const counts = TimeSeriesValuesHelper.getValues(this._clazz, this._count);
        const averages = new Array(valuesCount);

        for (let i = 0; i < valuesCount; i++) {
            if (!counts[i]) {
                averages[i] = NaN;
            } else {
                averages[i] = sums[i] / counts[i];
            }
        }

        this._average = TimeSeriesValuesHelper.setFields(this._clazz, averages);

        return this._average;
    }

    public getValuesFromMembers(): number[] {
        const valuesCount = TimeSeriesValuesHelper.getFieldsMapping(this._clazz).length;

        const result = new Array(valuesCount * 6);
        this._assignRollup(result, this._first, 0);
        this._assignRollup(result, this._last, 1);
        this._assignRollup(result, this._min, 2);
        this._assignRollup(result, this._max, 3);
        this._assignRollup(result, this._sum, 4);
        this._assignRollup(result, this._count, 5);

        return result;
    }

    private _assignRollup(target: number[], source: TValues, offset: number) {
        if (source) {
            const values = TimeSeriesValuesHelper.getValues(this._clazz, source);
            if (values) {
                for (let i = 0; i < values.length; i++) {
                    target[i * 6 + offset] = values[i];
                }
            }
        }
    }

    public static fromEntry<TValues extends object>(entry: TimeSeriesEntry, clazz: ClassConstructor<TValues>): TypedTimeSeriesRollupEntry<TValues> {
        const result = new TypedTimeSeriesRollupEntry(clazz, entry.timestamp);
        result.rollup = true;
        result.tag = entry.tag;

        const values = entry.values;

        result._first = TimeSeriesValuesHelper.setFields(clazz, TypedTimeSeriesRollupEntry._extractValues(values, 0));
        result._last = TimeSeriesValuesHelper.setFields(clazz, TypedTimeSeriesRollupEntry._extractValues(values, 1));
        result._min = TimeSeriesValuesHelper.setFields(clazz, TypedTimeSeriesRollupEntry._extractValues(values, 2));
        result._max = TimeSeriesValuesHelper.setFields(clazz, TypedTimeSeriesRollupEntry._extractValues(values, 3));
        result._sum = TimeSeriesValuesHelper.setFields(clazz, TypedTimeSeriesRollupEntry._extractValues(values, 4));
        result._count = TimeSeriesValuesHelper.setFields(clazz, TypedTimeSeriesRollupEntry._extractValues(values, 5));

        return result;
    }

    private static _extractValues(input: number[], offset: number): number[] {
        const length = Math.ceil((input.length - offset) / 6);
        let idx = 0;
        const result = new Array(length);

        while (idx < length) {
            result[idx] = input[offset + idx * 6];
            idx++;
        }

        return result;
    }
}