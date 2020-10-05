import { DocumentConventions, ErrorFirstCallback, IDocumentStore, IndexDefinition, IndexPriority } from "../..";

export interface IAbstractIndexCreationTask {

    getIndexName(): string;
    priority: IndexPriority;
    conventions: DocumentConventions;

    createIndexDefinition(): IndexDefinition;

    execute(store: IDocumentStore): Promise<void>;
    execute(store: IDocumentStore, callback: ErrorFirstCallback<void>): Promise<void>;
    execute(store: IDocumentStore, conventions: DocumentConventions): Promise<void>;
    execute(
        store: IDocumentStore,
        conventions: DocumentConventions,
        callback: ErrorFirstCallback<void>): Promise<void>;
    execute(store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void>;
    execute(
        store: IDocumentStore,
        conventions: DocumentConventions,
        database: string,
        callback: ErrorFirstCallback<void>): Promise<void>;
}