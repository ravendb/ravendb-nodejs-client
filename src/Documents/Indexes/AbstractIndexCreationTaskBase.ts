import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexDefinition } from "./IndexDefinition";
import { IndexPriority, IndexLockMode, FieldIndexing, FieldStorage, FieldTermVector } from "./Enums";
import { IDocumentStore } from "../IDocumentStore";
import { PutIndexesOperation } from "../Operations/Indexes/PutIndexesOperation";
import { SpatialOptions } from "./Spatial";

export abstract class AbstractIndexCreationTaskBase {

    /**
     *  Creates the index definition.
     */
    public abstract createIndexDefinition(): IndexDefinition;
    
    public conventions: DocumentConventions;
    protected additionalSources: { [key: string]: string };
    public priority: IndexPriority;
    public lockMode: IndexLockMode;

    /**
     * Gets a value indicating whether this instance is map reduce index definition
     * @return true if index is map reduce
     */
    public get isMapReduce(): boolean {
        return false;
    }

    /**
     * Generates index name from type name replacing all _ with /
     */
    public getIndexName(): string {
        return AbstractIndexCreationTaskBase.getIndexNameForCtor(this.constructor.name);
    }

    public static getIndexNameForCtor(indexCtorName: string) {
        return indexCtorName.replace(/_/g, "/");
    }

    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(
        store: IDocumentStore): Promise<void>;
    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(
        store: IDocumentStore, conventions: DocumentConventions): Promise<void>;
    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(
        store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void>;
    public async execute(
        store: IDocumentStore, conventions?: DocumentConventions, database?: string): Promise<void> {
        if (arguments.length === 1) {
            return store.executeIndex(this);
        } else {
            return this._putIndex(store, conventions, database);
        }
    }

    private async _putIndex(
        store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void> {
        const oldConventions = this.conventions;

        try {
            this.conventions = conventions || this.conventions || store.conventions;

            const indexDefinition = this.createIndexDefinition();
            indexDefinition.name = this.getIndexName();

            if (this.lockMode) {
                indexDefinition.lockMode = this.lockMode;
            }

            if (this.priority) {
                indexDefinition.priority = this.priority;
            }

            await store.maintenance.forDatabase(database || store.database)
                .send(new PutIndexesOperation(indexDefinition));
        } finally {
            this.conventions = oldConventions;
        }
    }
    
}
