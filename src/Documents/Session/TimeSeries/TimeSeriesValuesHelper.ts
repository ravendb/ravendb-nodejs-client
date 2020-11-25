import { ClassConstructor } from "../../../Types";
import { throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { TimeSeriesValue } from "./TimeSeriesValue";

type TimeSeriesFieldsMapping = { field: string; name: string }[];


export class TimeSeriesValuesHelper {

    private static readonly _cache = new Map<ClassConstructor<any>, TimeSeriesFieldsMapping>();

    public static getFieldsMapping(clazz: ClassConstructor<any>): TimeSeriesFieldsMapping {
        if (TimeSeriesValuesHelper._cache.has(clazz)) {
            return TimeSeriesValuesHelper._cache.get(clazz);
        }

        if ("TIME_SERIES_VALUES" in clazz) {
            const values = clazz["TIME_SERIES_VALUES"] as TimeSeriesValue<any>;
            if (TypeUtil.isArray(values)) {
                const mapping: TimeSeriesFieldsMapping = [];

                for (const value of values) {
                    let field: string;
                    let name: string;
                    if (TypeUtil.isString(value)) {
                        field = value;
                        name = value;
                    } else if (TypeUtil.isObject(value) && value.field && value.name) {
                        field = value.field;
                        name = value.name;
                    } else {
                        throwError("InvalidOperationException", "Invalid field mapping. Expected string or { field: string, name: string } object. Got: " + value);
                    }

                    const nameAlreadyUsed = !!mapping.find(x => x.field === field || x.name === name);
                    if (nameAlreadyUsed) {
                        throwError("InvalidOperationException", "All fields and names must be unique.");
                    }

                    mapping.push({
                        field, name
                    });
                }

                TimeSeriesValuesHelper._cache.set(clazz, mapping);
                return mapping;
            } else {
                throwError("InvalidOperationException", "The mapping of " + clazz + " is invalid.");
            }
        }

        return null;
    }

    public static getValues<T extends object>(clazz: ClassConstructor<T>, obj: T): number[] {
        const mapping = TimeSeriesValuesHelper.getFieldsMapping(clazz)
        if (!mapping) {
            return null;
        }

        return mapping.map(m => obj[m.field]);
    }

    public static setFields<T extends object>(clazz: ClassConstructor<T>, values: number[], asRollup: boolean = false): T {
        if (!values) {
            return null;
        }

        const mapping = TimeSeriesValuesHelper.getFieldsMapping(clazz);
        if (!mapping) {
            return null;
        }

        const obj = new clazz();

        for (let i = 0; i < mapping.length; i++) {
            let index = i;
            const item = mapping[i];

            let value = Number.NaN;
            if (index < values.length) {
                if (asRollup) {
                    index *= 6;
                }

                value = values[index];
            }

            obj[item.field] = value;
        }

        return obj;
    }
}
