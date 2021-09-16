import { IndexPriority, IndexState } from "./Enums";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexDefinition } from "./IndexDefinition";
import { IDocumentStore } from "../IDocumentStore";
import { IndexDeploymentMode } from "./IndexDeploymentMode";

export interface IAbstractIndexCreationTask {

    getIndexName(): string;
    priority: IndexPriority;
    state: IndexState;
    deploymentMode: IndexDeploymentMode;
    conventions: DocumentConventions;

    createIndexDefinition(): IndexDefinition;

    execute(store: IDocumentStore): Promise<void>;
    execute(store: IDocumentStore, conventions: DocumentConventions): Promise<void>;
    execute(store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void>;
}