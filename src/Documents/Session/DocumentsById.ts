import { DocumentInfo } from "./DocumentInfo";
import { CaseInsensitiveKeysMap } from "../../Primitives/CaseInsensitiveKeysMap";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";

export class DocumentsById {

    public _inner: Map<string, DocumentInfo>;

    public constructor() {
        this._inner = CaseInsensitiveKeysMap.create();
    }

    public getValue(id: string) {
        return this._inner.get(id);
    }

    public add(info: DocumentInfo): void {
        if (this._inner.has(info.id)) {
            return;
        }

        this._inner.set(info.id, info);
    }

    public remove(id: string): boolean {
        return this._inner.delete(id);
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

    public getTrackedEntities(session: InMemoryDocumentSessionOperations): Map<string, EntityInfo> {
        const result = CaseInsensitiveKeysMap.create<EntityInfo>();

        for (const keyValue of this._inner.entries()) {
            const entityInfo = new EntityInfo();
            entityInfo.id = keyValue[0];
            entityInfo.entity = keyValue[1].entity;
            entityInfo.isDeleted = session.isDeleted(keyValue[0]);
            result[keyValue[0]] = entityInfo;
        }

        return result;
    }
}


export class EntityInfo {
    id: string;
    entity: object;
    isDeleted: boolean;
}
