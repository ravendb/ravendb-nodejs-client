import { IndexDefinition } from "./IndexDefinition";
import { AbstractIndexCreationTaskBase } from "./AbstractIndexCreationTaskBase";

export class AbstractJavaScriptIndexCreationTask extends AbstractIndexCreationTaskBase {

    private readonly _definition: IndexDefinition = new IndexDefinition();

    protected constructor() {
        super();
        this._definition.lockMode = "Unlock";
        this._definition.priority = "Normal";
    }

    public get fields() {
        return this._definition.fields;
    }

    public set fields(value) {
        this._definition.fields = value;
    }

    public get isMapReduce(): boolean {
        return !!this._definition.reduce;
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
    protected map<T>(collection: string, definition: MapDefinition<T>): void {
        this._definition.maps.add(`map(\'${collection}\', ${definition.toString()})`);
    }

    /**
     * Sets the index defintion reduce
     * @param mapReduce Map reduce defintion provided by groupBy and aggregate operation 
     */
    protected reduce<T>(mapReduce: ReduceDefinition<T>): void {
        this._definition.reduce = mapReduce(new GroupResults<T>()).format()
    }

    /**
     * 
     * @param key A key to associated the source script with
     * @param source Additional source script to provide to the index maps 
     */
    protected addSource(key: String, source: Function) : void {
        this.additionalSources = this.additionalSources ?? {};

        this.additionalSources[key.toString()] = source.toString();
    }

    /**
     * No implementation is required here, the interface is purely meant to expose map helper methods such as `load(id, collection)` etc
     * @returns Empty MapUtils object 
     */
    protected getMapUtils<T>() : MapUtils<T> {
        return new StubMapUtils<T>();
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

type LoadDocument<T> = (id: string | string[], collection: string) => T;

type CreateSpatialField = (lat: number, lng: number) => void;

interface MapUtils<T>
{
    /**
     * Loads the specified document(s) during the indexing process
     */
    load: LoadDocument<T>,
    /**
     * Generates a spatial field in the index, generating a Point from the provided lat/lng coordinates
     */
    createSpatialField: CreateSpatialField
}

/**
 * This class is provided solely to allow typed definition of the index map 
 */
class StubMapUtils<T> implements MapUtils<T>
{
    load: LoadDocument<T>;
    createSpatialField: CreateSpatialField;
}

/**
 * Helper types and classes to facilitate the creation of typed groupBy and aggregate defintion for the maps reduce. 
 * For ex:
 * ```
 * r.groupBy(f => f.foo).aggregate(g => ({ key: g.key }))
 * ```
 */
type MapDefinition<T> = (document: T) => object;

type ReduceDefinition<T> = (result: GroupResults<T>) => MapReduceFormatter<T>;

type KeySelector<T> = (document: T) => string;

interface Group<TValue>
{
    key: string;
    values: TValue[];
}

class GroupResults<T> {
    public groupBy(selector: KeySelector<T>): ReduceResults<T> {
        return new ReduceResults<T>(selector);
    }
}

class ReduceResults<T> {
    private _group: KeySelector<T>;

    constructor(selector: KeySelector<T>) {
        this._group = selector;
    }

    public aggregate(reducer: MapDefinition<Group<T>>): MapReduceFormatter<T> {
        return new MapReduceFormatter<T>(this._group, reducer);
    }
}

class MapReduceFormatter<T> {
    private _groupBy: KeySelector<T>;
    private _aggregate: MapDefinition<Group<T>>;

    constructor(groupBy: KeySelector<T>, aggregate: MapDefinition<Group<T>>) {
       this._groupBy = groupBy;
       this._aggregate = aggregate;
    }

    public format(): string {
        let fmt = `groupBy(${this._groupBy}).aggregate(${this._aggregate})`;

        return fmt;
    } 
}