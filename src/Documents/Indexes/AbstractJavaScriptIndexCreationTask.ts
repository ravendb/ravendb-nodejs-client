import { IndexDefinition } from "./IndexDefinition";
import { AbstractIndexCreationTaskBase } from "./AbstractIndexCreationTaskBase";

export class AbstractJavaScriptIndexCreationTask extends AbstractIndexCreationTaskBase {

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

    public get configuration() {
        return this._definition.configuration;
    }

    public set configuration(value) {
        this._definition.configuration = value;
    }
    
    public get isMapReduce(): boolean {
        return !!this.reduce;
    }

    public get outputReduceToCollection() {
        return this._definition.outputReduceToCollection;
    }

    public set outputReduceToCollection(value) {
        this._definition.outputReduceToCollection = value;
    }

    public createIndexDefinition(): IndexDefinition {
        this._definition.type = this.isMapReduce ? "JavaScriptMapReduce" : "JavaScriptMap";

        if (this.additionalSources) {
            this._definition.additionalSources = this.additionalSources;
        } else {
            this._definition.additionalSources = {};
        }

        return this._definition;
    }
}
