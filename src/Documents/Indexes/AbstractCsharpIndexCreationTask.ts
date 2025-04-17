import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { IndexDefinition, IndexDefinitionBuilder } from "./IndexDefinition.js";
import { AbstractGenericIndexCreationTask } from "./AbstractGenericIndexCreationTask.js";
import { INDEXES } from "../../Constants.js";
import { ObjectUtil } from "../../Utility/ObjectUtil.js";

/**
 * Base class for creating indexes using C# code in string.
 * If you want to create JavaScript based index, please use:
 *
 * __AbstractJavaScriptIndexCreationTask__
 */
export abstract class AbstractCsharpIndexCreationTask extends AbstractGenericIndexCreationTask {

    public map: string;
    public reduce: string;

    /**
     * Gets a value indicating whether this instance is map reduce index definition
     * @return if index is of type: Map/Reduce
     */
    public get isMapReduce(): boolean {
        return !!this.reduce;
    }

    /**
     * Creates the index definition.
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
        indexDefinitionBuilder.vectorFieldStrings = this.vectorOptionsStrings
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
        indexDefinitionBuilder.compoundFieldsStrings = this.compoundFieldsStrings;
        indexDefinitionBuilder.archivedDataProcessingBehavior = this.archivedDataProcessingBehavior;

        if (this.searchEngineType && this.searchEngineType !== "None") {
            indexDefinitionBuilder.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = this.searchEngineType;
        } else if (!ObjectUtil.isEmpty(this.vectorOptionsStrings)) {
            indexDefinitionBuilder.configuration[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = "Corax";
        }

        return indexDefinitionBuilder.toIndexDefinition(this.conventions);
    }
}
