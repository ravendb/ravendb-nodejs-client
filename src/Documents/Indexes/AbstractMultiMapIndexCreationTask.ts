import { throwError } from "../../Exceptions";
import { IndexDefinition, IndexDefinitionBuilder } from "./IndexDefinition";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { AbstractGenericIndexCreationTask } from "./AbstractGenericIndexCreationTask";

export class AbstractMultiMapIndexCreationTask extends AbstractGenericIndexCreationTask {

    private maps: string[] = [];

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
        indexDefinitionBuilder.indexesStrings = this._indexesStrings;
        indexDefinitionBuilder.analyzersStrings = this._analyzersStrings;
        indexDefinitionBuilder.reduce = this._reduce;
        indexDefinitionBuilder.storesStrings = this._storesStrings;
        indexDefinitionBuilder.suggestionsOptions = this._indexSuggestions;
        indexDefinitionBuilder.termVectorsStrings = this._termVectorsStrings;
        indexDefinitionBuilder.spatialIndexesStrings = this._spatialOptionsStrings;
        indexDefinitionBuilder.outputReduceToCollection = this._outputReduceToCollection;
        indexDefinitionBuilder.patternForOutputReduceToCollectionReferences = this._patternForOutputReduceToCollectionReferences;
        indexDefinitionBuilder.patternReferencesCollectionName = this._patternReferencesCollectionName;
        indexDefinitionBuilder.additionalSources = this.additionalSources;
        indexDefinitionBuilder.configuration = this.configuration;
        indexDefinitionBuilder.lockMode = this.lockMode;
        indexDefinitionBuilder.priority = this.priority;

        const indexDefinition = indexDefinitionBuilder.toIndexDefinition(this.conventions, false);
        indexDefinition.maps = new Set(this.maps);

        return indexDefinition;
    }
}
