import { IndexDefinition, IndexDefinitionBuilder } from "./IndexDefinition";
import {
    IndexingGroupResults,
    IndexingMapDefinition,
    IndexingMapUtils,
    IndexingReduceDefinition, StubMapUtils
} from "./StronglyTyped";
import { DocumentType } from "../DocumentAbstractions";
import { TypeUtil } from "../../Utility/TypeUtil";
import { throwError } from "../../Exceptions";
import { StringUtil } from "../../Utility/StringUtil";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { StringBuilder } from "../../Utility/StringBuilder";
import { BaseJavaScriptIndexCreationTask } from "./BaseJavaScriptIndexCreationTask";

export class AbstractJavaScriptIndexCreationTask<TDocument extends object, TMapResult extends object = any>
    extends BaseJavaScriptIndexCreationTask<keyof TMapResult & string> {

    private _map: string;
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
    public map(collectionOrDocumentType: string | DocumentType<TDocument>, definition: IndexingMapDefinition<TDocument, TMapResult>) {
        if (this._map) {
            throwError("InvalidOperationException",
                "Map function was already defined. " +
                "If you are trying to create multi map index, please use AbstractJavaScriptMultiMapIndexCreationTask class.");
        }

        const collection = TypeUtil.isString(collectionOrDocumentType)
            ? collectionOrDocumentType
            : this.conventions.findCollectionName(collectionOrDocumentType);

        const escapedCollection = new StringBuilder();
        StringUtil.escapeString(escapedCollection, collection);
        const rawMap = `map('${escapedCollection.toString()}', ${definition})`;

        this._map = this.postProcessDefinition(rawMap, "map");
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
    public addSource(source: Function): void;
    // eslint-disable-next-line @typescript-eslint/ban-types
    public addSource(name: string, source: Function): void;
    // eslint-disable-next-line @typescript-eslint/ban-types
    public addSource(nameOrFunction: string | Function, source?: Function): void {
        this.additionalSources ??= {};

        if (!TypeUtil.isString(nameOrFunction)) {
            return this.addSource(nameOrFunction.name, nameOrFunction);
        }

        const sourceAsString = source.toString();

        if (!sourceAsString.includes("function")) {
            throwError("InvalidOperationException", "Additional sources require named function. Arrow functions are not supported.");
        }

        this.additionalSources[nameOrFunction] = source.toString();
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
        indexDefinitionBuilder.map = this._map;
        indexDefinitionBuilder.reduce = this._reduce;
        indexDefinitionBuilder.storesStrings = this.storesStrings;
        indexDefinitionBuilder.suggestionsOptions = this.indexSuggestions;
        indexDefinitionBuilder.termVectorsStrings = this.termVectorsStrings;
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

        return indexDefinitionBuilder.toIndexDefinition(this.conventions);
    }
}
