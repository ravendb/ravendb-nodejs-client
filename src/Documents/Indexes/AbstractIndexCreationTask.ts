import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IndexDefinition, IndexDefinitionBuilder } from "./IndexDefinition";
import { AbstractGenericIndexCreationTask } from "./AbstractGenericIndexCreationTask";

/**
 * Base class for creating indexes
 */
export abstract class AbstractIndexCreationTask extends AbstractGenericIndexCreationTask {

    public map: string;

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
        indexDefinitionBuilder.outputReduceToCollection = this.outputReduceToCollection;
        indexDefinitionBuilder.patternForOutputReduceToCollectionReferences = this.patternForOutputReduceToCollectionReferences;
        indexDefinitionBuilder.patternReferencesCollectionName = this.patternReferencesCollectionName;
        indexDefinitionBuilder.additionalSources = this.additionalSources;
        indexDefinitionBuilder.configuration = this.configuration;
        indexDefinitionBuilder.lockMode = this.lockMode;
        indexDefinitionBuilder.priority = this.priority;

        return indexDefinitionBuilder.toIndexDefinition(this.conventions);
    }
}
