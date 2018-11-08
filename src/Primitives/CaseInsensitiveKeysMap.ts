import { TypeUtil } from "../Utility/TypeUtil";
import { stringify } from "qs";

const originalKeysMap: WeakMap<Map<string, any>, Map<string, string>>
    = new WeakMap();

function getOriginalKey(targetMap: Map<string, any>, key: string) {
    const keysMap = originalKeysMap.get(targetMap);
    return keysMap.get(key);
}

function setOriginalKey(targetMap: Map<string, any>, origKey: string, lowerKey: string) {
    let keysMap;
    if (!originalKeysMap.has(targetMap)) {
        keysMap = new Map<string, string>();
        originalKeysMap.set(targetMap, keysMap);
    } else {
        keysMap = originalKeysMap.get(targetMap);
    }

    keysMap.set(lowerKey, origKey);
}

function deleteOriginalKey(targetMap: Map<string, any>, lowerKey: string) {
    if (!originalKeysMap.has(targetMap)) {
        return;
    }

    originalKeysMap.get(targetMap).delete(lowerKey);
}

function validateKey(key) {
    if (TypeUtil.isNullOrUndefined(key)
        || TypeUtil.isString(key)) {
        return;
    }

    throw Error("Key must be a string.");
}

function normalizeKey(key: string) {
    return key ? key.toLowerCase() : key;
}
export class CaseInsensitiveKeysMap {

    public static create<TValue>(): Map<string, TValue> {
        const result = new Map<string, TValue>();
        const origSet = result.set;
        const origGet = result.get;
        const origHas = result.has;
        const origDelete = result.delete;

        result["keysCaseSensitive"] = false;
        result.set = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            const lowerKey = normalizeKey(key);
            setOriginalKey(result, key, lowerKey);
            return origSet.call(result, lowerKey, ...rest);
        };

        result.get = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            const lowerKey = normalizeKey(key);
            return origGet.call(result, lowerKey, ...rest);
        };

        result.has = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            const lowerKey = normalizeKey(key);
            return origHas.call(result, lowerKey, ...rest);
        };

        result.delete = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            const lowerKey = normalizeKey(key);
            deleteOriginalKey(result, lowerKey);
            return origDelete.call(result, lowerKey, ...rest);
        };

        const origEntries = result.entries;
        result.entries = function () {
            return Array.from(origEntries.call(result) as Iterable<[string, TValue]>)
                .reduce((reduced, next) => {
                    const actualKey = getOriginalKey(result, next[0]);
                    return [...reduced, [actualKey, next[1]]];
                }, [])[Symbol.iterator]();
        };

        return result;
    }
}
