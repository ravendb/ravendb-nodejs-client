import { TimeSeriesIndexDefinition } from "./TimeSeriesIndexDefinition";
import { AbstractIndexCreationTaskBase } from "../AbstractIndexCreationTaskBase";
import { FieldIndexing, FieldStorage, FieldTermVector } from "../Enums";
import { SpatialOptions, SpatialOptionsFactory } from "../Spatial";
import { CONSTANTS } from "../../../Constants";

/**
 * Abstract class used to provide infrastructure service for actual creation tasks
 */
export abstract class AbstractGenericTimeSeriesIndexCreationTask extends AbstractIndexCreationTaskBase<TimeSeriesIndexDefinition> {
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

    /**
     * Register a field to be indexed
     */
    protected index(field: string, indexing: FieldIndexing): void {
        this._indexesStrings[field] = indexing;
    }

    /**
     * Register a field to be spatially indexed
     */
    protected spatial(field: string, indexing: (spatialOptsFactory: SpatialOptionsFactory) => SpatialOptions): void {
        this._spatialOptionsStrings[field] = indexing(new SpatialOptionsFactory());
    }

    // TBD protected void Store(Expression<Func<TReduceResult, object>> field, FieldStorage storage)

    protected storeAllFields(storage: FieldStorage): void {
        this._storesStrings[CONSTANTS.Documents.Indexing.Fields.ALL_FIELDS] = storage;
    }

    /**
     * Register a field to be stored
     */
    protected store(field: string, storage: FieldStorage): void {
        this._storesStrings[field] = storage;
    }

    /**
     * Register a field to be analyzed
     */
    protected analyze(field: string, analyzer: string): void {
        this._analyzersStrings[field] = analyzer;
    }

    /**
     * Register a field to have term vectors
     */
    protected termVector(field: string, termVector: FieldTermVector): void {
        this._termVectorsStrings[field] = termVector;
    }

    protected suggestion(field: string): void {
        this._indexSuggestions.add(field);
    }
}
