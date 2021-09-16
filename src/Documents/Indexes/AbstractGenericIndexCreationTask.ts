import { AbstractIndexCreationTaskBase } from "./AbstractIndexCreationTaskBase";
import { FieldStorage, FieldIndexing, FieldTermVector } from "./Enums";
import { SpatialOptions, SpatialOptionsFactory } from "./Spatial";
import { CONSTANTS } from "../../Constants";
import { IndexDefinition } from "./IndexDefinition";
import { AdditionalAssembly } from "./AdditionalAssembly";
import { throwError } from "../../Exceptions";

type FieldOrAllFields<TField> = TField | "__all_fields";

/**
 * Base class for creating indexes
 */
export abstract class AbstractGenericIndexCreationTask<TField extends string = string> extends AbstractIndexCreationTaskBase<IndexDefinition> {

    protected storesStrings: Record<FieldOrAllFields<TField>, FieldStorage>;
    protected indexesStrings: Record<FieldOrAllFields<TField>, FieldIndexing>;
    protected analyzersStrings: Record<FieldOrAllFields<TField>, string>;
    protected indexSuggestions: Set<FieldOrAllFields<TField>>;
    protected termVectorsStrings: Record<FieldOrAllFields<TField>, FieldTermVector>;
    protected spatialOptionsStrings: Record<FieldOrAllFields<TField>, SpatialOptions>;

    protected outputReduceToCollection: string;
    protected patternForOutputReduceToCollectionReferences: string;
    protected patternReferencesCollectionName: string;

    public constructor() {
        super();

        this.storesStrings = {} as Record<FieldOrAllFields<TField>, FieldStorage>;
        this.indexesStrings = {} as Record<FieldOrAllFields<TField>, FieldIndexing>;
        this.analyzersStrings = {} as Record<FieldOrAllFields<TField>, string>;
        this.indexSuggestions = new Set<FieldOrAllFields<TField>>();
        this.termVectorsStrings = {} as Record<FieldOrAllFields<TField>, FieldTermVector>;
        this.spatialOptionsStrings = {} as Record<FieldOrAllFields<TField>, SpatialOptions>;
    }

    abstract get isMapReduce(): boolean;

    /**
     * Register a field to be indexed
     */
    // tslint:disable-next-line:function-name
    protected index(field: FieldOrAllFields<TField>, indexing: FieldIndexing): void {
        this.indexesStrings[field] = indexing;
    }

    /**
     * Register a field to be spatially indexed
     */
    // tslint:disable-next-line:function-name
    protected spatial(field: FieldOrAllFields<TField>, indexing: (spatialOptsFactory: SpatialOptionsFactory) => SpatialOptions): void {
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
    protected store(field: TField, storage: FieldStorage): void {
        this.storesStrings[field] = storage;
    }

    /**
     * Register a field to be analyzed
     */
    // tslint:disable-next-line:function-name
    protected analyze(field: FieldOrAllFields<TField>, analyzer: string): void {
        this.analyzersStrings[field] = analyzer;
    }

    /**
     * Register a field to have term vectors
     */
    // tslint:disable-next-line:function-name
    protected termVector(field: FieldOrAllFields<TField>, termVector: FieldTermVector): void {
        this.termVectorsStrings[field] = termVector;
    }

    // tslint:disable-next-line:function-name
    protected suggestion(field: FieldOrAllFields<TField>): void {
        this.indexSuggestions.add(field);
    }

    protected addAssembly(assembly: AdditionalAssembly) {
        if (!assembly) {
            throwError("InvalidArgumentException", "Assembly cannot be null");
        }

        if (!this.additionalAssemblies) {
            this.additionalAssemblies = [];
        }

        this.additionalAssemblies.push(assembly);
    }
}
