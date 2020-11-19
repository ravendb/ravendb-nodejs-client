import { IndexPriority } from "./Enums";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexDefinition } from "./IndexDefinition";
import { IDocumentStore } from "../IDocumentStore";

export interface IAbstractIndexCreationTask {

    getIndexName(): string;
    priority: IndexPriority;
    conventions: DocumentConventions;

    createIndexDefinition(): IndexDefinition;

    execute(store: IDocumentStore): Promise<void>;
    execute(store: IDocumentStore, conventions: DocumentConventions): Promise<void>;
    execute(store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void>;
}