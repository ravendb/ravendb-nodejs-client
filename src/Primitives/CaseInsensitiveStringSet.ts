import { CaseInsensitiveKeysStore } from "./CaseInsensitiveKeysStore";


function validateKey(key) {
    if (!(key && key.toLowerCase)) {
        throw Error("Key must be a string.");
    }
}

export class CaseInsensitiveStringSet {
    public static create(): Set<string> {
        const result = new Set<string>();
        const origAdd = result.add;
        const origHas = result.has;
        const origDelete = result.delete;

        const originalKeysStore = new CaseInsensitiveKeysStore();
        result.add = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            const lowerKey = originalKeysStore.setKey(key);
            return origAdd.call(result, lowerKey, ...rest);
        };

        result.has = function (...args) {
            const [ key, ...rest ] = args;
            const lowerKey = originalKeysStore.normalizeKey(key);
            return origHas.call(result, lowerKey, ...rest);
        };

        result.delete = function (...args) {
            const [ key, ...rest ] = args;
            const lowerKey = originalKeysStore.deleteKey(key);
            return origDelete.call(result, lowerKey, ...rest);
        };

        result.entries = () => 
            [...originalKeysStore.getKeys()]
            .map(x => [x, x] as [string, string])[Symbol.iterator](); 

        result[Symbol.iterator] = () => 
            [...originalKeysStore.getKeys()][Symbol.iterator](); 

        return result;
    }
}
