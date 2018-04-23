import {throwError} from "../../Exceptions/index";
import { IndexPriority, FieldStorage, FieldIndexing, FieldTermVector } from "./Enums";
import { IndexLockMode } from "./IndexLockMode";
import { IndexType } from "../../Primitives/Indexing";
import { IndexFieldOptions } from "./IndexFieldOptions";
import { SpatialOptions } from "./Spatial";
import { DocumentConventions } from "../Conventions/DocumentConventions";

export interface IndexConfiguration { 
    [key: string]: string; 
}

export class IndexDefinition {

    public name: string;
    public priority: IndexPriority;

    /**
     * Index lock mode:
     * - Unlock - all index definition changes acceptable
     * - LockedIgnore - all index definition changes will be ignored, only log entry will be created
     * - LockedError - all index definition changes will raise exception
     */
    public lockMode: IndexLockMode;
    public indexType: IndexType;
    public additionalSources: { [key: string]: string } = {};
    public maps: Set<string> = new Set();
    public reduce: string;
    public fields: { [fieldName: string]: IndexFieldOptions } = {};
    public configuration: IndexConfiguration = {};
    // TBD private boolean testIndex;
    public outputReduceToCollection: string;

    public toJSON() {
        return Object.assign({}, this, { maps: Array.from(this.maps) });
    }

    // /**
    //  * All the map functions for this index
    //  * @return index maps
    //  */
    // public get maps(): Set<string> {
    //     if (!this.maps) {
    //         this.maps = new Set();
    //     }

    //     return this.maps;
    // }

    // /**
    //  * All the map functions for this index
    //  * @param maps Sets the value
    //  */
    // public set maps(maps) {
    //     this.maps = maps;
    // }

    // /**
    //  * Index reduce function
    //  * @return reduce function
    //  */
    // public get reduce() {
    //     return this.reduce;
    // }

    // /**
    //  * Index reduce function
    //  * @param reduce Sets the reduce function
    //  */
    // public set reduce(reduce) {
    //     this.reduce = reduce;
    // }

    public toString(): string {
        return this.name;
    }

    // public  get fields() {
    //     if (!this.fields) {
    //         this.fields = {};
    //     }
    //     return this.fields;
    // }

    // public set fields(fields) {
    //     this.fields = fields;
    // }

    // public get configuration(): IndexConfiguration {
    //     if (this.configuration) {
    //         this.configuration = {};
    //     }
    //     return this.configuration;
    // }

    // public set configuration(configuration) {
    //     this.configuration = configuration;
    // }

    public get type(): IndexType {
        if (!this.indexType || this.indexType === "NONE") {
            this.indexType = this._detectStaticIndexType();
        }

        return this.indexType;
    }

    public set type(indexType) {
        this.indexType = indexType;
    }

    private _detectStaticIndexType(): IndexType  {
        if (!this.reduce) {
            return "MAP";
        }
        return "MAP_REDUCE";
    }

    // public get lockMode(): IndexLockMode {
    //     return this.lockMode;
    // }

    // public set lockMode(value: IndexLockMode) {
    //     this.lockMode = value;
    // }

    // TBD public boolean isTestIndex()

    // TBD public void setTestIndex(boolean testIndex)

    /**
     * If not null than each reduce result will be created as a document in the specified collection name.
     * @return true if index outputs should be saved to collection
     */
    // public get outputReduceToCollection(): string {
    //     return this.outputReduceToCollection;
    // }

    // /**
    //  * If not null than each reduce result will be created as a document in the specified collection name.
    //  * @param outputReduceToCollection Sets the value
    //  */
    // public set outputReduceToCollection(outputReduceToCollection) {
    //     this.outputReduceToCollection = outputReduceToCollection;
    // }

    // public get name(): string {
    //     return this.name;
    // }

    // public set name(value: string) {
    //     this.name = value;
    // }

    // public get priority(): IndexPriority {
    //     return this.priority;
    // }

    // public set priority(value: IndexPriority) {
    //     this.priority = value;
    // }

    // public get additionalSources() {
    //     return this.additionalSources;
    // }

    // public set additionalSources(val) {
    //     this.additionalSources = val;
    // }
    
}

export class IndexDefinitionBuilder {

    public indexName: string;
    public map: string;
    public reduce: string;
    public priority: IndexPriority;
    public lockMode: IndexLockMode;
    public additionalSources: { [key: string]: string };
    public storesStrings: { [key: string]: FieldStorage };
    public indexesStrings: { [key: string]: FieldIndexing };
    public analyzersStrings: { [key: string]: string };
    public suggestionsOptions: Set<string>;
    public termVectorsStrings: { [key: string]: FieldTermVector };
    public spatialIndexesStrings: { [key: string]: SpatialOptions };
    public outputReduceToCollection: string;

    public constructor(indexName?: string) {
        this.indexName = indexName || this.constructor.name;
        this.storesStrings = {};
        this.indexesStrings = {};
        this.suggestionsOptions = new Set();
        this.analyzersStrings = {};
        this.termVectorsStrings = {};
        this.spatialIndexesStrings = {};
    }

    public toIndexDefinition(conventions: DocumentConventions, validateMap?: boolean): IndexDefinition {
        if (!this.map && validateMap) {
            throwError("InvalidOperationException", 
                "Map is required to generate an index, "
                + " you cannot create an index without a valid Map property (in index " 
                + this.indexName + ").");
        }

        try {
            const indexDefinition = new IndexDefinition();
            indexDefinition.name = this.indexName;
            indexDefinition.reduce = this.reduce;
            indexDefinition.lockMode = this.lockMode;
            indexDefinition.priority = this.priority;
            indexDefinition.outputReduceToCollection = this.outputReduceToCollection;

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

            if (this.map) {
                indexDefinition.maps.add(this.map);
            }

            indexDefinition.additionalSources = this.additionalSources;
            return indexDefinition;
        } catch (err) {
            throwError("IndexCompilationException", "Failed to create index " + this.indexName, err);
        }
    }

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

    // public get map(): string {
    //     return this._map;
    // }

    // public set map(value: string) {
    //     this._map = value;
    // }

    // public get reduce(): string {
    //     return this._reduce;
    // }

    // public set reduce(value: string) {
    //     this._reduce = value;
    // }

    // public get priority(): IndexPriority {
    //     return this._priority;
    // }

    // public set priority(value: IndexPriority) {
    //     this._priority = value;
    // }

    // public get lockMode(): IndexLockMode {
    //     return this._lockMode;
    // }

    // public set lockMode(value: IndexLockMode) {
    //     this._lockMode = value;
    // }

    // public get suggestionsOptions(): Set<string> {
    //     return this._suggestionsOptions;
    // }

    // public set suggestionsOptions(value: Set<string>) {
    //     this._suggestionsOptions = value;
    // }

    // public get outputReduceToCollection(): string {
    //     return this._outputReduceToCollection;
    // }

    // public set outputReduceToCollection(value: string) {
    //     this._outputReduceToCollection = value;
    // }

    // public get storesStrings() {
    //     return this._storesStrings;
    // }

    // public set storesStrings(storesStrings) {
    //     this._storesStrings = storesStrings;
    // }

    // public get indexesStrings() {
    //     return this._indexesStrings;
    // }

    // public set indexesStrings(indexesStrings) {
    //     this._indexesStrings = indexesStrings;
    // }

    // public getAnalyzersStrings() {
    //     return this._analyzersStrings;
    // }

    // public set analyzersStrings(analyzersStrings) {
    //     this._analyzersStrings = analyzersStrings;
    // }

    // public get termVectorsStrings() {
    //     return this._termVectorsStrings;
    // }

    // public set termVectorsStrings(termVectorsStrings) {
    //     this._termVectorsStrings = termVectorsStrings;
    // }

    // public get spatialIndexesStrings() {
    //     return this._spatialIndexesStrings;
    // }

    // public set spatialIndexesStrings(spatialIndexesStrings) {
    //     this._spatialIndexesStrings = spatialIndexesStrings;
    // }

    // public get additionalSources() {
    //     return this._additionalSources;
    // }

    // public set additionalSources(additionalSources) {
    //     this._additionalSources = additionalSources;
    // }

}
