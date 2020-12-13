import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexDefinition } from "./IndexDefinition";
import { IndexPriority, IndexLockMode } from "./Enums";
import { IDocumentStore } from "../IDocumentStore";
import { PutIndexesOperation } from "../Operations/Indexes/PutIndexesOperation";
import { AbstractCommonApiForIndexes } from "./AbstractCommonApiForIndexes";
import { IAbstractIndexCreationTask } from "./IAbstractIndexCreationTask";
import { DocumentStoreBase } from "../DocumentStoreBase";

export abstract class AbstractIndexCreationTaskBase<TIndexDefinition extends IndexDefinition>
    extends AbstractCommonApiForIndexes implements IAbstractIndexCreationTask {
    
    /**
     *  Creates the index definition.
     */
    public abstract createIndexDefinition(): TIndexDefinition;
    
    public conventions: DocumentConventions;
    public priority: IndexPriority;
    public lockMode: IndexLockMode;

    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(store: IDocumentStore): Promise<void>;
    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(store: IDocumentStore, conventions: DocumentConventions): Promise<void>;
    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void>;
    public async execute(
        store: IDocumentStore, 
        conventions?: DocumentConventions,
        database?: string): Promise<void> {
        if (!conventions && !database) {
            return store.executeIndex(this);
        }

        return this._putIndex(store, conventions, database);
    }

    private async _putIndex(
        store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void> {
        const oldConventions = this.conventions;

        try {
            database = DocumentStoreBase.getEffectiveDatabase(store, database);
            this.conventions = conventions || this.conventions || store.getRequestExecutor(database).conventions;

            const indexDefinition = this.createIndexDefinition();
            indexDefinition.name = this.getIndexName();

            if (this.lockMode) {
                indexDefinition.lockMode = this.lockMode;
            }

            if (this.priority) {
                indexDefinition.priority = this.priority;
            }

            await store.maintenance.forDatabase(database)
                .send(new PutIndexesOperation(indexDefinition));
        } finally {
            this.conventions = oldConventions;
        }
    }
    
}
