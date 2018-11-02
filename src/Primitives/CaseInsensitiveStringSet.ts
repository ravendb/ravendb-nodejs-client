
export class CaseInsensitiveStringSet {
    public static create(): Set<string> {
        const result = new Set();
        const origAdd = result.add;
        const origHas = result.has;
        const origDelete = result.delete;

        function validateKey(key) {
            if (!(key && key.toLowerCase)) {
                throw Error("Key must be a string.");
            }
        }

        result.add = function (...args) {
            const [ key, ...rest ] = args;
            validateKey(key);
            return origAdd.call(result, key ? key.toLowerCase() : key, ...rest);
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
