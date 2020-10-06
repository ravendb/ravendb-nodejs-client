import { throwError } from "../../../Exceptions";
import { ClassConstructor } from "../../../Types";
import { TypedTimeSeriesEntry } from "./TypedTimeSeriesEntry";

export class TimeSeriesEntry {
    public timestamp: Date;
    public tag: string;
    public values: number[];
    public rollup: boolean;

    public get value(): number {
        if (this.values.length === 1) {
            return this.values[0];
        }

        throwError("InvalidOperationException", "Entry has more than one value.");
    }

    public set value(value: number) {
        if (this.values.length === 1) {
            this.values[0] = value;
            return;
        }

        throwError("InvalidOperationException", "Entry has more than one value.");
    }

    public asTypedEntry<T extends object>(clazz: ClassConstructor<T>) {
        const entry = new TypedTimeSeriesEntry();
        entry.rollup = this.rollup;
        entry.tag = this.tag;
        entry.timestamp = this.timestamp;
        entry.values = this.values;
        entry.value = TimeSeriesValuesHelper.setFields(clazz, this.values, this.rollup);
        return entry;
    }
}