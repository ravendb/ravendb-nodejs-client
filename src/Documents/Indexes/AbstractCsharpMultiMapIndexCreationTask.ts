import { throwError } from "../../Exceptions";
import { IndexDefinition, IndexDefinitionBuilder } from "./IndexDefinition";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { AbstractGenericIndexCreationTask } from "./AbstractGenericIndexCreationTask";

export class AbstractCsharpMultiMapIndexCreationTask extends AbstractGenericIndexCreationTask {

    private maps: string[] = [];

    public reduce: string;

    /**
     * Gets a value indicating whether this instance is map reduce index definition
     * @return if index is of type: Map/Reduce
     */
    public get isMapReduce(): boolean {
        return !!this.reduce;
    }

    // since this class is meant to be extended by the user, we don't follow protected name convention here
    // tslint:disable-next-line:function-name
    protected addMap(map: string) {
        if (!map) {
            throwError("InvalidArgumentException", "Map cannot be null.");
        }
        this.maps.push(map);
    }

    public createIndexDefinition(): IndexDefinition {
        if (!this.conventions) {
            this.conventions = new DocumentConventions();
        }

        const indexDefinitionBuilder = new IndexDefinitionBuilder(this.getIndexName());
        indexDefinitionBuilder.indexesStrings = this.indexesStrings;
        indexDefinitionBuilder.analyzersStrings = this.analyzersStrings;
        indexDefinitionBuilder.reduce = this.reduce;
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

        const indexDefinition = indexDefinitionBuilder.toIndexDefinition(this.conventions, false);
        indexDefinition.maps = new Set(this.maps);

        return indexDefinition;
    }
}
