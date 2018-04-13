import { ClassConstructor } from "../Types";
import { throwError } from "../Exceptions";
import { DateUtil } from "../Utility/DateUtil";

function camelCaseReviver(key, value) {
    if (key && !Array.isArray(this)) {
        this[key.charAt(0).toLowerCase() + key.slice(1)] = value;
    } else {
        return value;
    }
}

function pascalCaseReplacer(key, value) {
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

function pascalCaseReviver(key, value) {
    if (key && !Array.isArray(this)) {
        this[key.charAt(0).toUpperCase() + key.slice(1)] = value;
    } else {
        return value;
    }
}

function camelCaseReplacer(key, value) {
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

export interface JsonSerializationTransform {
    reviver?: (key, value) => any;
    replacer?: (key, value) => any;
}

export const targetJsonPascalCase: JsonSerializationTransform = {
    reviver: camelCaseReviver,
    replacer: pascalCaseReplacer 
};

export const targetJsonCamelCase: JsonSerializationTransform = {
    reviver: camelCaseReviver,
    replacer: pascalCaseReplacer 
};

export const JSON_SERIALIZATION_TRANSORM = {
    targetJsonCamelCase,
    targetJsonPascalCase
};

export function parseJson(jsonString: string, reviver?: (key, val) => any) {
    return JSON.parse(jsonString, reviver);
}

export function stringifyJson(o: Object, replacer?: (key, val) => any) {
    return JSON.stringify(o, replacer);
}

export interface JsonParserSettings {
    transform?: JsonSerializationTransform;
}

export class JsonSerializer {

    private _reviver: (key, val) => any;
    private _replacer: (key, val) => any;

    constructor(opts: JsonParserSettings) {
        opts = opts || {};
        const transform = opts.transform || {};
        this._reviver = transform.reviver;
        this._replacer = transform.replacer;
    }

    public deserialize<TResult = object>(jsonString: string) {
        return parseJson(jsonString, this._reviver) as TResult;
    }

    public serialize(obj: object) {
        return stringifyJson(obj, this._replacer);
    }

}
