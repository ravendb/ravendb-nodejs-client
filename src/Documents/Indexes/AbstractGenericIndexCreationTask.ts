import { AbstractIndexCreationTaskBase } from "./AbstractIndexCreationTaskBase";
import { FieldStorage, FieldIndexing, FieldTermVector } from "./Enums";
import { SpatialOptions, SpatialOptionsFactory } from "./Spatial";
import { CONSTANTS } from "../../Constants";

/**
 * Base class for creating indexes
 */
export abstract class AbstractGenericIndexCreationTask extends AbstractIndexCreationTaskBase {

    protected map: string;
    protected reduce: string;

    protected storesStrings: { [key: string]: FieldStorage };
    protected indexesStrings: { [key: string]: FieldIndexing };
    protected analyzersStrings: { [key: string]: string };
    protected indexSuggestions: Set<string>;
    protected termVectorsStrings: { [key: string]: FieldTermVector };
    protected spatialOptionsStrings: { [key: string]: SpatialOptions };

    protected outputReduceToCollection: string;
    protected patternForOutputReduceToCollectionReferences: string;

    // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
    public constructor() {
        super();
        this.storesStrings = {};
        this.indexesStrings = {};
        this.analyzersStrings = {};
        this.indexSuggestions = new Set();
        this.termVectorsStrings = {};
        this.spatialOptionsStrings = {};
    }

    /**
     * Gets a value indicating whether this instance is map reduce index definition
     * @return if index is of type: Map/Reduce
     */
    public get isMapReduce(): boolean {
        return !!this.reduce;
    }

    /**
     * Register a field to be indexed
     */
    // tslint:disable-next-line:function-name
    protected index(field: string, indexing: FieldIndexing): void {
        this.indexesStrings[field] = indexing;
    }

    /**
     * Register a field to be spatially indexed
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
     */
    // tslint:disable-next-line:function-name
    protected store(field: string, storage: FieldStorage): void {
        this.storesStrings[field] = storage;
    }

    /**
     * Register a field to be analyzed
     */
    // tslint:disable-next-line:function-name
    protected analyze(field: string, analyzer: string): void {
        this.analyzersStrings[field] = analyzer;
    }

    /**
     * Register a field to have term vectors
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
