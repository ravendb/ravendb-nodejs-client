import { throwError } from "../../../Exceptions";
import { ClassConstructor } from "../../../Types";
import { TypedTimeSeriesEntry } from "./TypedTimeSeriesEntry";
import { TimeSeriesValuesHelper } from "./TimeSeriesValuesHelper";

export class TimeSeriesEntry {
    public timestamp: Date;
    public tag: string;
    public values: number[];
    public isRollup: boolean;
    public nodeValues: Record<string, number[]>;

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
        const entry = new TypedTimeSeriesEntry<T>();
        entry.isRollup = this.isRollup;
        entry.tag = this.tag;
        entry.timestamp = this.timestamp;
        entry.values = this.values;
        entry.value = TimeSeriesValuesHelper.setFields(clazz, this.values, this.isRollup);
        return entry;
    }
}
