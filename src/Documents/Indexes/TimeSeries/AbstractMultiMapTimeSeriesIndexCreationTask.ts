import { throwError } from "../../../Exceptions";
import { CountersIndexDefinitionBuilder } from "../Counters/CountersIndexDefinitionBuilder";
import { TimeSeriesIndexDefinition } from "./TimeSeriesIndexDefinition";
import { AbstractGenericTimeSeriesIndexCreationTask } from "./AbstractGenericTimeSeriesIndexCreationTask";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export abstract class AbstractMultiMapTimeSeriesIndexCreationTask extends AbstractGenericTimeSeriesIndexCreationTask {
    private readonly maps: string[] = [];

    protected _addMap(map: string) {
        if (!map) {
            throwError("InvalidArgumentException", "Map cannot be null");
        }

        this.maps.push(map);
    }

    createIndexDefinition(): TimeSeriesIndexDefinition {
        if (!this.conventions) {
            this.conventions = new DocumentConventions();
        }

        const indexDefinitionBuilder = new CountersIndexDefinitionBuilder(this.getIndexName());

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