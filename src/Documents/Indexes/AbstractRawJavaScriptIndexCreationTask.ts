import { IndexDefinition } from "./IndexDefinition";
import { AbstractIndexCreationTaskBase } from "./AbstractIndexCreationTaskBase";

export class AbstractRawJavaScriptIndexCreationTask extends AbstractIndexCreationTaskBase {

    private readonly _definition: IndexDefinition = new IndexDefinition();

    protected constructor() {
        super();
        this._definition.lockMode = "Unlock";
        this._definition.priority = "Normal";
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
     * @return Gets the collection name of the documents to which each reduce result output to 
     */
    public get outputReduceToCollection() {
        return this._definition.outputReduceToCollection;
    }

    /**
     * @param value If not null then each reduce result will be created as a document in the specified collection name.
     */
    public set outputReduceToCollection(value) {
        this._definition.outputReduceToCollection = value;
    }

    /**
     * @return Gets the collection name of the reference documents created based on provided pattern
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
     * @return Gets the collection name for reference documents created based on provided pattern
     */
    public get patternForOutputReduceToCollectionReferences() {
        return this._definition.patternForOutputReduceToCollectionReferences;
    }

    /**
     * @value Defines a collection name for reference documents created based on provided pattern
     */
    public set patternForOutputReduceToCollectionReferences(value: string) {
        this._definition.patternForOutputReduceToCollectionReferences = value;
    }

    public createIndexDefinition(): IndexDefinition {
        this._definition.type = this.isMapReduce ?  "JavaScriptMapReduce" : "JavaScriptMap";

        if (this.additionalSources) {
            this._definition.additionalSources = this.additionalSources;
        } else {
            this._definition.additionalSources = {};
        }

        return this._definition;
    }
}