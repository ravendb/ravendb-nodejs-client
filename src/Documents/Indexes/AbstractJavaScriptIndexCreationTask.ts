import { IndexDefinition } from "./IndexDefinition";
import { AbstractIndexCreationTaskBase } from "./AbstractIndexCreationTaskBase";

type IndexMapDefinition<T> = (document: T) => object | object[];

type AggregateResult<T> = (result: T) => object;

type KeySelector<T> = (document: T) => string;

interface Group<TValue>
{
    key: string;
    values: TValue[];
}

class ReduceResults<TSource> {
    private _group: KeySelector<TSource>;

    constructor(selector: KeySelector<TSource>) {
        this._group = selector;
    }

    public aggregate(selector: AggregateResult<Group<TSource>>): string {
        let reduce = `
            groupBy(${this._group.toString()})
                .aggregate(${selector.toString()})
        `
        return reduce;
    }
}

type LoadDocment<T> = (id: string, collection: string) => T

interface MapUtils<T>
{
    load: LoadDocment<T> 
}

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

    /**
     * @param collection Collection name to index over 
     * @param definition Index definition that maps to the indexed properties  
     */
    protected map<T>(collection: String, definition: IndexMapDefinition<T>) : void {
        this.maps.add(`map(${collection}, ${definition.toString()}`);
    }

    /**
     * 
     * @param key 
     * @param source Additional source script to provide to the index maps 
     */
    protected addSource(key: String, source: Function) : void {
        this.additionalSources = this.additionalSources ?? {};

        this.additionalSources[key.toString()] = source.toString();
    }

    /**
     * 
     * @param selector Group key selector for the reduce results
     * @returns Group reducer that exposes the `aggregate` function over the grouped results 
     */
    protected groupBy<TSource>(selector: KeySelector<TSource>) : ReduceResults<TSource> {
        return new ReduceResults(selector);
    }

    /**
     * No implementation is required; The interface is only what's exposed to allow usage of helper map methods
     * such as `load(id, collection)` etc.
     * @returns null
     */
    protected getMapUtils<T>() : MapUtils<T> {
        return null;
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
