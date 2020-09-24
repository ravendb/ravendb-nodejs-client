import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexConfiguration, IndexDefinition } from "./IndexDefinition";
import { IndexPriority, IndexLockMode } from "./Enums";
import { IDocumentStore } from "../IDocumentStore";
import { PutIndexesOperation } from "../Operations/Indexes/PutIndexesOperation";
import { ErrorFirstCallback } from "../../Types/Callbacks";
import { TypeUtil } from "../../Utility/TypeUtil";
import { passResultToCallback } from "../../Utility/PromiseUtil";

export abstract class AbstractIndexCreationTaskBase {


    protected constructor() {
        this.configuration = {};
    }

    /**
     *  Creates the index definition.
     */
    public abstract createIndexDefinition(): IndexDefinition;
    
    public conventions: DocumentConventions;
    protected additionalSources: { [key: string]: string };
    public configuration: IndexConfiguration;
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
