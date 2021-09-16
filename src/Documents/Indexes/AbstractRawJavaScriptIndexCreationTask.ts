import { IndexDefinition } from "./IndexDefinition";
import { AbstractIndexCreationTaskBase } from "./AbstractIndexCreationTaskBase";

/**
 * Utility class to create javascript based indexes using not-strongly typed syntax.
 *
 * Use AbstractJavaScriptIndexCreationTask for strongly-typed javascript indexes.
 */
export class AbstractRawJavaScriptIndexCreationTask extends AbstractIndexCreationTaskBase<IndexDefinition> {

    private readonly _definition: IndexDefinition = new IndexDefinition();

    protected constructor() {
        super();
    }

    public get maps() {
        return this._definition.maps;
    }

    public set maps(value) {
        this._definition.maps = value;
    }

    public get fields() {
        return this._definition.fields;
    }

    public set fields(value) {
        this._definition.fields = value;
    }

    public get reduce() {
        return this._definition.reduce;
    }

    public set reduce(value) {
        this._definition.reduce = value;
    }

    public get isMapReduce(): boolean {
        return !!this.reduce;
    }

    /**
     * @return If not null than each reduce result will be created as a document in the specified collection name.
     */
    public get outputReduceToCollection() {
        return this._definition.outputReduceToCollection;
    }

    /**
     * @param value If not null than each reduce result will be created as a document in the specified collection name.
     */
    public set outputReduceToCollection(value) {
        this._definition.outputReduceToCollection = value;
    }

    /**
     * @return Defines a collection name for reference documents created based on provided pattern
     */
    public get patternReferencesCollectionName() {
        return this._definition.patternReferencesCollectionName;
    }

    /**
     * @param value Defines a collection name for reference documents created based on provided pattern
     */
    public set patternReferencesCollectionName(value: string) {
        this._definition.patternReferencesCollectionName = value;
    }

    /**
     * @return Defines a collection name for reference documents created based on provided pattern
     */
    public get patternForOutputReduceToCollectionReferences() {
        return this._definition.patternForOutputReduceToCollectionReferences;
    }

    /**
     * @param value Defines a collection name for reference documents created based on provided pattern
     */
    public set patternForOutputReduceToCollectionReferences(value: string) {
        this._definition.patternForOutputReduceToCollectionReferences = value;
    }

    public createIndexDefinition(): IndexDefinition {
        this._definition.name = this.getIndexName();
        this._definition.type = this.isMapReduce ? "JavaScriptMapReduce" : "JavaScriptMap";
        this._definition.name = this.getIndexName();

        if (this.additionalSources) {
            this._definition.additionalSources = this.additionalSources;
        } else {
            this._definition.additionalSources = {};
        }

        this._definition.additionalAssemblies = this.additionalAssemblies || [];

        this._definition.configuration = this.configuration;
        this._definition.lockMode = this.lockMode;
        this._definition.priority = this.priority;
        this._definition.state = this.state;
        this._definition.deploymentMode = this.deploymentMode;

        return this._definition;
    }
}
