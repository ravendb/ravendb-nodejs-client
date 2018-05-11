import { ClassConstructor } from "../Types";
import { throwError } from "../Exceptions";
import { DateUtil } from "../Utility/DateUtil";
import { CONSTANTS } from "../Constants";

export function camelCaseReviver(key, value) {
    if (key && !Array.isArray(this)) {
        const newKey = key.charAt(0).toLowerCase() + key.slice(1);
        if (key !== newKey) {
            this[newKey] = value;
        } else {
            return value;
        }
    } else {
        return value;
    }
}

export function pascalCaseReplacer(key, value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const replacement = {};
        for (const k in value) {
            if (Object.hasOwnProperty.call(value, k)) {
                replacement[k && k.charAt(0).toUpperCase() + k.substring(1)] = value[k];
            }
        }
        return replacement;
    }

    return value;
}

export function pascalCaseReviver(key, value) {
    if (key && !Array.isArray(this)) {
        const newKey = key.charAt(0).toUpperCase() + key.slice(1);
        if (key !== newKey) {
            this[newKey] = value;
        } else {
            return value;
        }
    } else {
        return value;
    }
}

export function camelCaseReplacer(key, value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const replacement = {};
        for (const k in value) {
            if (Object.hasOwnProperty.call(value, k)) {
                replacement[k && k.charAt(0).toLowerCase() + k.substring(1)] = value[k];
            }
        }
        return replacement;
    }

    return value;
}

export type JsonTransformFunction = (key, value) => any; 

export interface JsonSerializerSettings {
    reviver?: JsonTransformFunction;
    replacer?: JsonTransformFunction;
}

export class JsonSerializer {

    private _reviver: (key, val) => any;
    private _replacer: (key, val) => any;

    constructor(opts?: JsonSerializerSettings) {
        opts = opts || {};
        this._reviver = opts.reviver;
        this._replacer = opts.replacer;
    }

    public deserialize<TResult = object>(jsonString: string) {
        return JSON.parse(jsonString, this._reviver) as TResult;
    }

    public serialize(obj: object): string {
        return JSON.stringify(obj, this._replacer);
    }

    public static getDefault(): JsonSerializer {
        return new JsonSerializer();
    }

    public static getDefaultForCommandPayload(): JsonSerializer {
        return new JsonSerializer({
            reviver: camelCaseReviver,
            replacer: pascalCaseReplacer
        });
    }

    public static getDefaultForEntities() {
        return new JsonSerializer();
    }
}

export function tryGetConflict(metadata: object): boolean {
    return metadata[CONSTANTS.Documents.Metadata.CONFLICT] || false;
}
