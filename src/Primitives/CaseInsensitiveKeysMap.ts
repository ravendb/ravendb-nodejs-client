
export class CaseInsensitiveKeysMap {
    public static create<TValue>(): Map<string, TValue> {
        const result = new Map();
        const origSet = result.set;
        const origGet = result.get;
        const origHas = result.has;
        const origDelete = result.delete;

        function validateKey(key) {
            if (!("toLowerCase" in key)) {
                throw Error("Key must be a string");
            }
        }

        result.set = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            return origSet.call(result, key ? key.toLowerCase() : key, ...rest);
        };

        result.get = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            return origGet.call(result, key ? key.toLowerCase() : key, ...rest);
        };

        result.has = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            return origHas.call(result, key ? key.toLowerCase() : key, ...rest);
        };

        result.delete = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            return origDelete.call(result, key ? key.toLowerCase() : key, ...rest);
        };

        return result;
    }
}
