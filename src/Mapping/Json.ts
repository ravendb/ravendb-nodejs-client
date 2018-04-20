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

export function parseJson(jsonString: string, reviver?: (key, val) => any) {
    return JSON.parse(jsonString, reviver);
}

export function stringifyJson(o: Object, replacer?: (key, val) => any) {
    return JSON.stringify(o, replacer);
}

export interface JsonSerializerSettings {
    reviver?: JsonTransformFunction;
    replacer?: JsonTransformFunction;
}

export class JsonSerializer {

    private _reviver: (key, val) => any;
    private _replacer: (key, val) => any;

    constructor(opts: JsonSerializerSettings) {
        opts = opts || {};
        this._reviver = opts.reviver;
        this._replacer = opts.replacer;
    }

    public deserialize<TResult = object>(jsonString: string) {
        return parseJson(jsonString, this._reviver) as TResult;
    }

    public serialize(obj: object) {
        return stringifyJson(obj, this._replacer);
    }

}

export function tryGetConflict(metadata: object): boolean {
    return metadata[CONSTANTS.Documents.Metadata.CONFLICT] || false;
}