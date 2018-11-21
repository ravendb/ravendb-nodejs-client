import { TypeUtil } from "../Utility/TypeUtil";
import { CaseInsensitiveKeysStore } from "./CaseInsensitiveKeysStore";

function validateKey(key) {
    if (TypeUtil.isNullOrUndefined(key)
        || TypeUtil.isString(key)) {
        return;
    }

    throw Error("Key must be a string.");
}

export class CaseInsensitiveKeysMap {

    public static create<TValue>(): Map<string, TValue> {
        const result = new Map<string, TValue>();
        const origSet = result.set;
        const origGet = result.get;
        const origHas = result.has;
        const origDelete = result.delete;

        const originalKeysStore = new CaseInsensitiveKeysStore();

        result["keysCaseSensitive"] = false;
        result.set = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            const lowerKey = originalKeysStore.setKey(key);
            return origSet.call(result, lowerKey, ...rest);
        };

        result.get = function (...args) {
            const [ key, ...rest ] = args;
            const lowerKey = originalKeysStore.normalizeKey(key);
            return origGet.call(result, lowerKey, ...rest);
        };

        result.has = function (...args) {
            const [ key, ...rest ] = args;
            const lowerKey = originalKeysStore.normalizeKey(key);
            return origHas.call(result, lowerKey, ...rest);
        };

        result.delete = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            const lowerKey = originalKeysStore.deleteKey(key);
            return origDelete.call(result, lowerKey, ...rest);
        };

        const origEntries = result.entries;
        result.entries = function () {
            return Array.from(origEntries.call(result) as Iterable<[string, TValue]>)
                .reduce((reduced, next) => {
                    const actualKey = originalKeysStore.getKey(next[0]);
                    return [...reduced, [actualKey, next[1]]];
                }, [])[Symbol.iterator]();
        };

        result[Symbol.iterator] = function () {
            return Array.from(origEntries.call(result) as Iterable<[string, TValue]>)
                .reduce((reduced, next) => {
                    const actualKey = originalKeysStore.getKey(next[0]);
                    return [...reduced, [actualKey, next[1]]];
                }, [])[Symbol.iterator]();
        };
            

        return result;
    }
}
