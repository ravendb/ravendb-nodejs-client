import { TypeUtil } from "../Utility/TypeUtil.js";
import { CaseInsensitiveKeysStore } from "./CaseInsensitiveKeysStore.js";

function validateKey(key) {
    if (TypeUtil.isNullOrUndefined(key)
        || TypeUtil.isString(key)) {
        return;
    }

    throw new Error("Key must be a string.");
}

/**
 * Creates a Map<string, TValue> with case-insensitive key lookup.
 *
 * Bracket notation (map[key]) is also routed through the case-insensitive
 * lookup via a Proxy, matching the behavior of C#'s
 * Dictionary<string, V>(StringComparer.OrdinalIgnoreCase) where both
 * dict.TryGetValue("key") and dict["Key"] use the same comparer.
 */
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

        // Proxy so bracket notation (map["Key"]) goes through the same
        // case-insensitive get/set/has as the Map API methods.
        return new Proxy(result, {
            get(target, prop) {
                const value = Reflect.get(target, prop, target);
                if (typeof prop === "symbol" || typeof value === "function") {
                    if (typeof value === "function") {
                        return value.bind(target);
                    }
                    return value;
                }
                if (typeof prop === "string" && target.has(prop)) {
                    return target.get(prop);
                }
                return value;
            },
            set(target, prop, value) {
                if (typeof prop === "string" && prop !== "keysCaseSensitive") {
                    target.set(prop, value);
                    return true;
                }
                return Reflect.set(target, prop, value, target);
            },
        }) as Map<string, TValue>;
    }
}
