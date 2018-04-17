import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { Todo } from "../../Types";
import { IMetadataDictionary } from "./IDocumentSession";

export interface SessionEventsEmitter {
    on(eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): this;
    on(eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): this;
    on(eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): this;
    on(eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): this;

    removeListener(eventName: "beforeStore", eventHandler: (eventArgs: SessionBeforeStoreEventArgs) => void): void;
    removeListener(eventName: "afterSaveChanges", eventHandler: (eventArgs: Todo) => void): void;
    removeListener(eventName: "beforeQuery", eventHandler: (eventArgs: Todo) => void): void;
    removeListener(eventName: "beforeDelete", eventHandler: (eventArgs: Todo) => void): void;
}

export class SessionBeforeStoreEventArgs {
    private _documentMetadata: IMetadataDictionary;

    private _session: InMemoryDocumentSessionOperations;
    private _documentId: string;
    private _entity: Object;

    public constructor(session: InMemoryDocumentSessionOperations, documentId: string, entity: object) {
        this._session = session;
        this._documentId = documentId;
        this._entity = entity;
    }

    public get session() {
        return this._session;
    }

    public get documentId() {
        return this._documentId;
    }

    public getEntity(): Object {
        return this._entity;
    }

    public isMetadataAccessed(): boolean {
        return !!this._documentMetadata;
    }

    public getDocumentMetadata(): IMetadataDictionary {
        if (!this._documentMetadata) {
            this._documentMetadata = this._session.getMetadataFor(this._entity);
        }

        return this._documentMetadata;
    }
}