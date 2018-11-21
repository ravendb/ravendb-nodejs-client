
// export class CaseInsensitiveKeysStore<T extends object> {

//     private _originalKeys: WeakMap<T, Map<string, string>> = new WeakMap();

//     public getKey(target: T, key: string) {
//         const keysMap = this._originalKeys.get(target);
//         return keysMap.get(key);
//     }

//     public getKeys(target: T): IterableIterator<string> {
//         const keysMap = this._originalKeys.get(target);
//         return keysMap.values();
//     }

//     public setKey(target: T, origKey: string): string {
//         let keysMap;
//         if (!this._originalKeys.has(target)) {
//             keysMap = new Map<string, string>();
//             this._originalKeys.set(target, keysMap);
//         } else {
//             keysMap = this._originalKeys.get(target);
//         }

//         const lowerKey = this.normalizeKey(origKey);
//         keysMap.set(lowerKey, origKey);
//         return lowerKey;
//     }

//     public deleteKey(target: T, origKey: string): string {
//         if (!this._originalKeys.has(target)) {
//             return;
//         }

//         const lowerKey = this.normalizeKey(origKey);

//         this._originalKeys.get(target).delete(lowerKey);
//         return lowerKey;
//     }

//     public normalizeKey(key: string) {
//         return key ? key.toLowerCase() : key;
//     }

// }

export class CaseInsensitiveKeysStore {

    private _originalKeys: Map<string, string> = new Map();

    public getKey(key: string) {
        return this._originalKeys.get(
            this.normalizeKey(key));
    }

    public getKeys(): IterableIterator<string> {
        return this._originalKeys.values();
    }

    public setKey(origKey: string): string {
        const lowerKey = this.normalizeKey(origKey);
        this._originalKeys.set(lowerKey, origKey);
        return lowerKey;
    }

    public deleteKey(origKey: string): string {
        const lowerKey = this.normalizeKey(origKey);
        this._originalKeys.delete(lowerKey);
        return lowerKey;
    }

    public normalizeKey(key: string) {
        return key ? key.toLowerCase() : key;
    }
}
