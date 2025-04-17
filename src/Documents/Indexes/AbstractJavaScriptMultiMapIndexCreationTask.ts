import { IndexDefinition, IndexDefinitionBuilder } from "./IndexDefinition.js";
import {
    IndexingGroupResults,
    IndexingMapDefinition,
    IndexingMapUtils,
    IndexingReduceDefinition, StubMapUtils
} from "./StronglyTyped.js";
import { DocumentType } from "../DocumentAbstractions.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { throwError } from "../../Exceptions/index.js";
import { StringUtil } from "../../Utility/StringUtil.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { StringBuilder } from "../../Utility/StringBuilder.js";
import { BaseJavaScriptIndexCreationTask } from "./BaseJavaScriptIndexCreationTask.js";
import { INDEXES } from "../../Constants.js";
import { ObjectUtil } from "../../Utility/ObjectUtil.js";

export class AbstractJavaScriptMultiMapIndexCreationTask<TMapResult extends object = any>
    extends BaseJavaScriptIndexCreationTask<keyof TMapResult & string> {

    private _maps: string[] = [];
    private _reduce: string;

    protected constructor() {
        super();

        this.conventions = new DocumentConventions();
    }

    /**
     * Register map
     * @param collectionOrDocumentType Collection name to index over
     * @param definition Index definition that maps to the indexed properties
     */
    public map<TDocument extends object>(
        collectionOrDocumentType: string | DocumentType<TDocument>, definition: IndexingMapDefinition<TDocument, TMapResult>) {

        const collection = TypeUtil.isString(collectionOrDocumentType)
            ? collectionOrDocumentType
            : this.conventions.findCollectionName(collectionOrDocumentType);

        const escapedCollection = new StringBuilder();
        StringUtil.escapeString(escapedCollection, collection);
        const rawMap = `map('${escapedCollection.toString()}', ${definition})`;
        this._maps.push(this.postProcessDefinition(rawMap, "map"));
    }

    /**
     * Sets the index definition reduce
     * @param mapReduce Reduce definition
     */
    public reduce(mapReduce: IndexingReduceDefinition<TMapResult>) {
        const rawReduce = mapReduce(new IndexingGroupResults<TMapResult>()).format();
        this._reduce = this.postProcessDefinition(rawReduce, "reduce");
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    public addSource(name: string, source: Function): void {
        this.additionalSources ??= {};

        const sourceAsString = source.toString();

        if (!sourceAsString.includes("function")) {
            throwError("InvalidOperationException", "Additional sources require named function. Arrow functions are not supported.");
        }

        this.additionalSources[name] = source.toString();
    }

    /**
     * No implementation is required here, the interface is purely meant to expose map helper methods such as `load(id, collection)` etc
     */
    public mapUtils(): IndexingMapUtils {
        return new StubMapUtils();
    }

    public get isMapReduce(): boolean {
        return !!this.reduce;
    }

    public createIndexDefinition(): IndexDefinition {
        const indexDefinitionBuilder = new IndexDefinitionBuilder(this.getIndexName());
        indexDefinitionBuilder.indexesStrings = this.indexesStrings;
        indexDefinitionBuilder.analyzersStrings = this.analyzersStrings;
        indexDefinitionBuilder.reduce = this._reduce;
        indexDefinitionBuilder.storesStrings = this.storesStrings;
        indexDefinitionBuilder.suggestionsOptions = this.indexSuggestions;
        indexDefinitionBuilder.termVectorsStrings = this.termVectorsStrings;
        indexDefinitionBuilder.vectorFieldStrings = this.vectorOptionsStrings;
        indexDefinitionBuilder.spatialIndexesStrings = this.spatialOptionsStrings;
        indexDefinitionBuilder.outputReduceToCollection = this.outputReduceToCollection;
        indexDefinitionBuilder.patternForOutputReduceToCollectionReferences = this.patternForOutputReduceToCollectionReferences;
        indexDefinitionBuilder.patternReferencesCollectionName = this.patternReferencesCollectionName;
        indexDefinitionBuilder.additionalSources = this.additionalSources;
        indexDefinitionBuilder.additionalAssemblies = this.additionalAssemblies;
        indexDefinitionBuilder.configuration = this.configuration;
        indexDefinitionBuilder.lockMode = this.lockMode;
        indexDefinitionBuilder.priority = this.priority;
        indexDefinitionBuilder.state = this.state;
        indexDefinitionBuilder.deploymentMode = this.deploymentMode;

        if (this.searchEngineType) {
            indexDefinitionBuilder.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = this.searchEngineType;
        } else if (!ObjectUtil.isEmpty(this.vectorOptionsStrings)) {
            indexDefinitionBuilder.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = "Corax";
        }

        const indexDefinition = indexDefinitionBuilder.toIndexDefinition(this.conventions, false);
        indexDefinition.maps = new Set(this._maps);

        return indexDefinition;
    }
}
