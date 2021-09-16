import { IndexConfiguration, IndexDefinition } from "./IndexDefinition";
import { FieldIndexing, FieldStorage, FieldTermVector, IndexLockMode, IndexPriority, IndexState } from "./Enums";
import { SpatialOptions } from "./Spatial";
import { throwError } from "../../Exceptions";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexFieldOptions } from "./IndexFieldOptions";
import { IndexDeploymentMode } from "./IndexDeploymentMode";
import { AdditionalAssembly } from "./AdditionalAssembly";

export abstract class AbstractIndexDefinitionBuilder<TIndexDefinition extends IndexDefinition> {
    protected readonly _indexName: string;

    public reduce: string;

    public storesStrings: { [key: string]: FieldStorage };
    public indexesStrings: { [key: string]: FieldIndexing };
    public analyzersStrings: { [key: string]: string };
    public suggestionsOptions: Set<string>;
    public termVectorsStrings: { [key: string]: FieldTermVector };
    public spatialIndexesStrings: { [key: string]: SpatialOptions };

    public lockMode: IndexLockMode;
    public priority: IndexPriority;
    public state: IndexState;
    public deploymentMode: IndexDeploymentMode;
    public outputReduceToCollection: string;
    public patternForOutputReduceToCollectionReferences: string;
    public patternReferencesCollectionName: string;

    public additionalSources: Record<string, string>;
    public additionalAssemblies: AdditionalAssembly[];
    public configuration: IndexConfiguration;


    // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
    protected constructor(indexName: string) {
        this._indexName = indexName || this.constructor.name;
        if (this._indexName.length > 256) {
            throwError("InvalidArgumentException", "The index name is limited to 256 characters, but was: " + this._indexName);
        }
        this.storesStrings = {};
        this.indexesStrings = {};
        this.suggestionsOptions = new Set();
        this.analyzersStrings = {};
        this.termVectorsStrings = {};
        this.spatialIndexesStrings = {};
        this.configuration = {};
    }

    public toIndexDefinition(conventions: DocumentConventions, validateMap: boolean = true) {
        try {
            const indexDefinition = this._newIndexDefinition();
            indexDefinition.name = this._indexName;
            indexDefinition.reduce = this.reduce;
            indexDefinition.lockMode = this.lockMode;
            indexDefinition.priority = this.priority;
            indexDefinition.deploymentMode = this.deploymentMode;
            indexDefinition.state = this.state;
            indexDefinition.outputReduceToCollection = this.outputReduceToCollection;
            indexDefinition.patternForOutputReduceToCollectionReferences = this.patternForOutputReduceToCollectionReferences;
            indexDefinition.patternReferencesCollectionName = this.patternReferencesCollectionName;

            const suggestions: { [suggestionOption: string]: boolean } = Array.from(this.suggestionsOptions)
                .reduce((result, item) =>
                    Object.assign(result, { [item]: true }), {});

            this._applyValues(indexDefinition, this.indexesStrings,
                (options, value) => options.indexing = value);
            this._applyValues(indexDefinition, this.storesStrings,
                (options, value) => options.storage = value);
            this._applyValues(indexDefinition, this.analyzersStrings,
                (options, value) => options.analyzer = value);
            this._applyValues(indexDefinition, this.termVectorsStrings,
                (options, value) => options.termVector = value);
            this._applyValues(indexDefinition, this.spatialIndexesStrings,
                (options, value) => options.spatial = value);
            this._applyValues(indexDefinition, suggestions,
                (options, value) => options.suggestions = value);

            indexDefinition.additionalSources = this.additionalSources;
            indexDefinition.additionalAssemblies = this.additionalAssemblies;
            indexDefinition.configuration = this.configuration;

            this._toIndexDefinition(indexDefinition, conventions);

            return indexDefinition;
        } catch (err) {
            throwError("IndexCompilationException", "Failed to create index " + this._indexName, err);
        }
    }

    protected abstract _newIndexDefinition(): TIndexDefinition;

    protected abstract _toIndexDefinition(indexDefinition: TIndexDefinition, conventions: DocumentConventions);

    private _applyValues<T>(
        indexDefinition: IndexDefinition,
        values: { [fieldName: string]: T },
        action: (options: IndexFieldOptions, val: T) => void) {

        for (const fieldName of Object.keys(values)) {
            const fieldVal: T = values[fieldName];
            const field = indexDefinition.fields[fieldName] =
                indexDefinition.fields[fieldName] || new IndexFieldOptions();

            action(field, fieldVal);
        }
    }
}