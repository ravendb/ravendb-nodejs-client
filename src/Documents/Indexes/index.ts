import * as BluebirdPromise from "bluebird";
import {FieldStorage, FieldIndexing, FieldTermVector, IndexPriority, IndexLockMode} from "./Enums";
import { SpatialOptions, SpatialOptionsFactory } from "./Spatial";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexDefinition, IndexDefinitionBuilder } from "./IndexDefinition";
import { IDocumentStore } from "../IDocumentStore";
import { CONSTANTS } from "../../Constants";
import { PutIndexesOperation } from "../Operations/Indexes/PutIndexesOperation";
import { throwError } from "../../Exceptions";

export abstract class AbstractIndexCreationTask {

    protected map: string;
    protected reduce: string;

    public conventions: DocumentConventions;
    protected additionalSources: { [key: string]: string };
    public priority: IndexPriority;
    public lockMode: IndexLockMode;

    protected storesStrings: { [key: string]: FieldStorage };
    protected indexesStrings: { [key: string]: FieldIndexing };
    protected analyzersStrings: { [key: string]: string };
    protected indexSuggestions: Set<string>;
    protected termVectorsStrings: { [key: string]: FieldTermVector };
    protected spatialOptionsStrings: { [key: string]: SpatialOptions };

    protected outputReduceToCollection: string;

    public constructor() {
        this.storesStrings = {};
        this.indexesStrings = {};
        this.analyzersStrings = {};
        this.indexSuggestions = new Set();
        this.termVectorsStrings = {};
        this.spatialOptionsStrings = {};
    }

    /**
     * Creates the index definition.
     * @return Index definition
     */
    public createIndexDefinition(): IndexDefinition {
        if (!this.conventions) {
            this.conventions = new DocumentConventions();
        }

        const indexDefinitionBuilder = new IndexDefinitionBuilder(this.getIndexName());
        indexDefinitionBuilder.indexesStrings = this.indexesStrings;
        indexDefinitionBuilder.analyzersStrings = this.analyzersStrings;
        indexDefinitionBuilder.map = this.map;
        indexDefinitionBuilder.reduce = this.reduce;
        indexDefinitionBuilder.storesStrings = this.storesStrings;
        indexDefinitionBuilder.suggestionsOptions = this.indexSuggestions;
        indexDefinitionBuilder.termVectorsStrings = this.termVectorsStrings;
        indexDefinitionBuilder.spatialIndexesStrings = this.spatialOptionsStrings;
        indexDefinitionBuilder.outputReduceToCollection = this.outputReduceToCollection;
        indexDefinitionBuilder.additionalSources = this.additionalSources;

        return indexDefinitionBuilder.toIndexDefinition(this.conventions);
    }

    /**
     * Gets a value indicating whether this instance is map reduce index definition
     * @return if index is of type: Map/Reduce
     */
    public get isMapReduce() {
        return !!this.reduce;
    }

    /**
     * Generates index name from type name replacing all _ with /
     * @return index name
     */
    public getIndexName(): string {
        return AbstractIndexCreationTask.getIndexNameForCtor(this.constructor.name);
    }

    public static getIndexNameForCtor(indexCtorName: string) {
        return indexCtorName.replace(/_/g, "/");
    }

    /**
     * Executes the index creation against the specified document store.
     * @param store target document store
     */
    public async execute(store: IDocumentStore, conventions?: DocumentConventions, database?: string): Promise<void> {
        if (!conventions && !database) {
            return store.executeIndex(this);
        } else {
            return this._putIndex(store, conventions, database);
        }
    }

    private _putIndex(store: IDocumentStore, conventions: DocumentConventions, database: string): Promise<void> {
        const oldConventions = this.conventions;
        const result = BluebirdPromise.resolve()
            .then(() => {

                this.conventions = conventions || this.conventions || store.conventions;

                const indexDefinition = this.createIndexDefinition();
                indexDefinition.name = this.getIndexName();

                if (this.lockMode) {
                    indexDefinition.lockMode = this.lockMode;
                }

                if (this.priority) {
                    indexDefinition.priority = this.priority;
                }

                return store.maintenance.forDatabase(database || store.database)
                    .send(new PutIndexesOperation(indexDefinition))
                    .then(() => { return; });
            })
            .finally(() => this.conventions = oldConventions);

        return Promise.resolve(result);
    }

    /**
     * Register a field to be indexed
     * @param field Field
     * @param indexing Desired field indexing type
     */
    // tslint:disable-next-line:function-name
    protected index(field: string, indexing: FieldIndexing): void {
        this.indexesStrings[field] = indexing;
    }

    /**
     * Register a field to be spatially indexed
     * @param field Field
     * @param indexing factory for spatial options
     */
    // tslint:disable-next-line:function-name
    protected spatial(field: string, indexing: (spatialOptsFactory: SpatialOptionsFactory) => SpatialOptions): void {
        this.spatialOptionsStrings[field] = indexing(new SpatialOptionsFactory());
    }

    // TBD protected void Store(Expression<Func<TReduceResult, object>> field, FieldStorage storage)

    // tslint:disable-next-line:function-name
    protected storeAllFields(storage: FieldStorage): void {
        this.storesStrings[CONSTANTS.Documents.Indexing.Fields.ALL_FIELDS] = storage;
    }

    /**
     * Register a field to be stored
     * @param field Field name
     * @param storage Field storage value to use
     */
    // tslint:disable-next-line:function-name
    protected store(field: string, storage: FieldStorage): void {
        this.storesStrings[field] = storage;
    }

    /**
     * Register a field to be analyzed
     * @param field Field name
     * @param analyzer analyzer to use
     */
    // tslint:disable-next-line:function-name
    protected analyze(field: string, analyzer: string): void {
        this.analyzersStrings[field] = analyzer;
    }

    /**
     * Register a field to have term vectors
     * @param field Field name
     * @param termVector TermVector type
     */
    // tslint:disable-next-line:function-name
    protected termVector(field: string, termVector: FieldTermVector): void {
        this.termVectorsStrings[field] = termVector;
    }

    // tslint:disable-next-line:function-name
    protected suggestion(field: string): void {
        this.indexSuggestions.add(field);
    }
}

export class AbstractMultiMapIndexCreationTask extends AbstractIndexCreationTask {

    private maps: string[] = [];

    // since this class is meant to be extended by the user, we don't follow protected name convention here
    // tslint:disable-next-line:function-name
    protected addMap(map: string) {
        if (!map) {
            throwError("InvalidArgumentException", "Map cannot be null.");
        }
        this.maps.push(map);
    }

    public createIndexDefinition(): IndexDefinition  {
        if (!this.conventions) {
            this.conventions = new DocumentConventions();
        }

        const indexDefinitionBuilder = new IndexDefinitionBuilder(this.getIndexName());
        indexDefinitionBuilder.indexesStrings = this.indexesStrings;
        indexDefinitionBuilder.analyzersStrings = this.analyzersStrings;
        indexDefinitionBuilder.reduce = this.reduce;
        indexDefinitionBuilder.storesStrings = this.storesStrings;
        indexDefinitionBuilder.suggestionsOptions = this.indexSuggestions;
        indexDefinitionBuilder.termVectorsStrings = this.termVectorsStrings;
        indexDefinitionBuilder.spatialIndexesStrings = this.spatialOptionsStrings;
        indexDefinitionBuilder.outputReduceToCollection = this.outputReduceToCollection;
        indexDefinitionBuilder.additionalSources = this.additionalSources;

        const indexDefinition = indexDefinitionBuilder.toIndexDefinition(this.conventions);
        indexDefinition.maps = new Set(this.maps);

        return indexDefinition;
    }
}
