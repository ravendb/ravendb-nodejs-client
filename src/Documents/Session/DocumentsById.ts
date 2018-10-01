import {DocumentInfo} from "./DocumentInfo";

function normalizeId(id: string) {
    if (!id) {
        return null;
    }

    return id.toLowerCase();
}

export class DocumentsById {

    public _inner: Map<String, DocumentInfo>;

    public constructor() {
        this._inner = new Map();
    }

    public getValue(id: string) {
        return this._inner.get(normalizeId(id));
    }

    public add(info: DocumentInfo): void {
        if (this._inner.has(normalizeId(info.id))) {
            return;
        }

        this._inner.set(normalizeId(info.id), info);
    }

    public remove(id: string): boolean {
        return this._inner.delete(normalizeId(id));
    }

    public clear(): void {
        this._inner.clear();
    }

    public getCount(): number {
        return this._inner.size;
    }

    public entries() {
        return this._inner.entries();
    }
}
