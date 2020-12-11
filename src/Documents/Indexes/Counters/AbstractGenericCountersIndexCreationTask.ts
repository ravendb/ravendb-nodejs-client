import { AbstractIndexCreationTaskBase } from "../AbstractIndexCreationTaskBase";
import { FieldIndexing, FieldStorage, FieldTermVector } from "../Enums";
import { SpatialOptions, SpatialOptionsFactory } from "../Spatial";
import { CONSTANTS } from "../../../Constants";
import { CountersIndexDefinition } from "./CountersIndexDefinition";

export abstract class AbstractGenericCountersIndexCreationTask extends AbstractIndexCreationTaskBase<CountersIndexDefinition> {
    protected _reduce: string;

    protected _storesStrings: Record<string, FieldStorage>;
    protected _indexesStrings: Record<string, FieldIndexing>;
    protected _analyzersStrings: Record<string, string>;
    protected _indexSuggestions: Set<string>;
    protected _termVectorsStrings: Record<string, FieldTermVector>;
    protected _spatialOptionsStrings: Record<string, SpatialOptions>;

    protected _outputReduceToCollection: string;
    protected _patternForOutputReduceToCollectionReferences: string;
    protected _patternReferencesCollectionName: string;

    public constructor() {
        super();

        this._storesStrings = {};
        this._indexesStrings = {};
        this._analyzersStrings = {};
        this._indexSuggestions = new Set<string>();
        this._termVectorsStrings = {};
        this._spatialOptionsStrings = {};
    }

    /**
     * Gets a value indicating whether this instance is map reduce index definition
     */
    get isMapReduce(): boolean {
        return !!this._reduce;
    }

    // AbstractGenericIndexCreationTask

    /**
     * Register a field to be indexed
     */
    // tslint:disable-next-line:function-name
    protected index(field: string, indexing: FieldIndexing): void {
        this._indexesStrings[field] = indexing;
    }

    /**
     * Register a field to be spatially indexed
     */
    // tslint:disable-next-line:function-name
    protected spatial(field: string, indexing: (spatialOptsFactory: SpatialOptionsFactory) => SpatialOptions): void {
        this._spatialOptionsStrings[field] = indexing(new SpatialOptionsFactory());
    }

    // TBD protected void Store(Expression<Func<TReduceResult, object>> field, FieldStorage storage)

    // tslint:disable-next-line:function-name
    protected storeAllFields(storage: FieldStorage): void {
        this._storesStrings[CONSTANTS.Documents.Indexing.Fields.ALL_FIELDS] = storage;
    }

    /**
     * Register a field to be stored
     */
    // tslint:disable-next-line:function-name
    protected store(field: string, storage: FieldStorage): void {
        this._storesStrings[field] = storage;
    }

    /**
     * Register a field to be analyzed
     */
    // tslint:disable-next-line:function-name
    protected analyze(field: string, analyzer: string): void {
        this._analyzersStrings[field] = analyzer;
    }

    /**
     * Register a field to have term vectors
     */
    // tslint:disable-next-line:function-name
    protected termVector(field: string, termVector: FieldTermVector): void {
        this._termVectorsStrings[field] = termVector;
    }

    // tslint:disable-next-line:function-name
    protected suggestion(field: string): void {
        this._indexSuggestions.add(field);
    }
}