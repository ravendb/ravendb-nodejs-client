
export function pascalToCamelCaseReviver(key, value) {
    if (key && !Array.isArray(this)) {
        this[key.charAt(0).toLowerCase() + key.slice(1)] = value;
    } else {
        return value;
    }
}

export function camelToPascalCaseReplacer(key, value) {
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

export const REVIVER = {
    PASCAL_TO_CAMELCASE: pascalToCamelCaseReviver
};

export const REPLACER = {
    CAMEL_TO_PASCALCASE: camelToPascalCaseReplacer
};

export type ReviverType = "PASCAL_TO_CAMELCASE";
export type ReplacerType = "CAMEL_TO_PASCALCASE";

export function parseJson(jsonString: string, reviverType?: ReviverType) {
    return JSON.parse(jsonString, REVIVER[reviverType]);
}

export function stringifyJson(o: Object, replacerType?: ReplacerType) {
    return JSON.stringify(o, REPLACER[replacerType]);
}
