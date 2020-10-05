import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexConfiguration, IndexDefinition } from "./IndexDefinition";
import { IndexPriority, IndexLockMode } from "./Enums";
import { IDocumentStore } from "../IDocumentStore";
import { PutIndexesOperation } from "../Operations/Indexes/PutIndexesOperation";
import { ErrorFirstCallback } from "../../Types/Callbacks";
import { TypeUtil } from "../../Utility/TypeUtil";
import { passResultToCallback } from "../../Utility/PromiseUtil";
import { AbstractCommonApiForIndexes } from "./AbstractCommonApiForIndexes";
import { IAbstractIndexCreationTask } from "./IAbstractIndexCreationTask";

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
    public async execute(store: IDocumentStore, callback: ErrorFirstCallback<void>): Promise<void>;
    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(store: IDocumentStore, conventions: DocumentConventions): Promise<void>;
    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(
        store: IDocumentStore, 
        conventions: DocumentConventions, 
        callback: ErrorFirstCallback<void>): Promise<void>;
    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void>;
    /**
     * Executes the index creation against the specified document store.
     */
    public async execute(
        store: IDocumentStore, 
        conventions: DocumentConventions, 
        database: string, 
        callback: ErrorFirstCallback<void>): Promise<void>;
    public async execute(
        store: IDocumentStore, 
        conventionsOrCallback?: DocumentConventions | ErrorFirstCallback<void>, 
        databaseOrCallback?: string | ErrorFirstCallback<void>,
        callback?: ErrorFirstCallback<void>): Promise<void> {
       
        let conventions: DocumentConventions;
        let database: string;
        if (arguments.length > 1) {
            if (TypeUtil.isFunction(conventionsOrCallback)) {
                callback = conventionsOrCallback;
            } else if (TypeUtil.isFunction(databaseOrCallback)) {
                callback = databaseOrCallback;
                conventions = conventionsOrCallback;
            } else {
                conventions = conventionsOrCallback;
                database = databaseOrCallback; 
            }
        }

        callback = callback || TypeUtil.NOOP;

        let resultPromise;
        if (!conventions && !database) {
            resultPromise = store.executeIndex(this);
        } else {
            resultPromise = this._putIndex(store, conventions, database);
        }

        passResultToCallback(resultPromise, callback);

        return resultPromise;
    }

    private async _putIndex(
        store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void> {
        const oldConventions = this.conventions;

        try {
            const databaseForConventions = database || store.database;
            this.conventions = conventions || this.conventions || store.getRequestExecutor(databaseForConventions).conventions;

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
