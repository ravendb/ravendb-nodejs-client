import { IndexConfiguration } from "./IndexDefinition";
import { AbstractIndexCreationTask } from "./AbstractIndexCreationTask";

export abstract class AbstractCommonApiForIndexes {
    additionalSources: Record<string, string>;
    configuration: IndexConfiguration;

    protected constructor() {
        this.configuration = {};
    }

    /**
     * Gets a value indicating whether this instance is map reduce index definition
     */
    public get isMapReduce(): boolean {
        return false;
    }

    /**
     * Generates index name from type name replacing all _ with /
     */
    public getIndexName() {
        return AbstractIndexCreationTask.getIndexNameForCtor(this.constructor.name); //TODO: find better place for this method?
    }
}