import { IDocumentStore } from "../IDocumentStore";
import { ClassConstructor, DocumentConventions, MaintenanceOperationExecutor } from "../..";
import { TypeUtil } from "../../Utility/TypeUtil";
import {
    ConfigureTimeSeriesValueNamesOperation,
    ConfigureTimeSeriesValueNamesParameters
} from "../Operations/TimeSeries/ConfigureTimeSeriesValueNamesOperation";
import { throwError } from "../../Exceptions";
import { TimeValue } from "../../Primitives/TimeValue";
import { TimeSeriesPolicy } from "../Operations/TimeSeries/TimeSeriesPolicy";
import { ConfigureTimeSeriesPolicyOperation } from "../Operations/TimeSeries/ConfigureTimeSeriesPolicyOperation";
import { StringUtil } from "../../Utility/StringUtil";
import { RawTimeSeriesPolicy } from "../Operations/TimeSeries/RawTimeSeriesPolicy";
import { ConfigureRawTimeSeriesPolicyOperation } from "../Operations/TimeSeries/ConfigureRawTimeSeriesPolicyOperation";
import { RemoveTimeSeriesPolicyOperation } from "../Operations/TimeSeries/RemoveTimeSeriesPolicyOperation";
import { TimeSeriesValuesHelper } from "../Session/TimeSeries/TimeSeriesValuesHelper";

export class TimeSeriesOperations {
    private readonly _store: IDocumentStore;
    private readonly _database: string;
    private readonly _executor: MaintenanceOperationExecutor;

    public constructor(store: IDocumentStore)
    public constructor(store: IDocumentStore, database: string)
    public constructor(store: IDocumentStore, database?: string) {
        this._store = store;
        this._database = database || store.database;
        this._executor = this._store.maintenance.forDatabase(database);
    }

    /**
     * Register value names of a time-series
     * @param collectionClass Collection class
     * @param timeSeriesEntryClass Time-series entry class
     */
    public register<TCollection, TTimeSeriesEntry>(
        collectionClass: ClassConstructor<TCollection>,
        timeSeriesEntryClass: ClassConstructor<TTimeSeriesEntry>): Promise<void>;
    /**
     * Register value names of a time-series
     * @param collectionClass Collection class
     * @param timeSeriesEntryClass Time-series entry class
     * @param name Override time series entry name
     */
    public async register<TCollection, TTimeSeriesEntry>(
        collectionClass: ClassConstructor<TCollection>,
        timeSeriesEntryClass: ClassConstructor<TTimeSeriesEntry>, name: string): Promise<void>;
    /**
     * Register value name of a time-series
     * @param collectionClass Collection class
     * @param name Time series name
     * @param valueNames Values to register
     */
    public async register<TCollection>(
        collectionClass: ClassConstructor<TCollection>,
        name: string,
        valueNames: string[]): Promise<void>;
    /**
     * Register value name of a time-series
     * @param collection Collection name
     * @param name Time series name
     * @param valueNames Values to register
     */
    public async register(
        collection: string,
        name: string,
        valueNames: string[]): Promise<void>
    public async register(
        collectionClassOrCollection: ClassConstructor<any> | string,
        timeSeriesEntryClassOrName: string | ClassConstructor<any>,
        nameOrValuesName?: string | string[]): Promise<void> {
        if (TypeUtil.isString(collectionClassOrCollection)) {
            return this._registerInternal(collectionClassOrCollection, timeSeriesEntryClassOrName as string, nameOrValuesName as string[]);
        } else {
            const collectionClass = collectionClassOrCollection as ClassConstructor<any>;
            if (TypeUtil.isString(timeSeriesEntryClassOrName)) {
                const collection = this._store.conventions.findCollectionName(collectionClass);
                await this._registerInternal(collection, timeSeriesEntryClassOrName, nameOrValuesName as string[]);
            } else { // [ClassConstructor<TCollection>, ClassConstructor<TTimeSeriesEntry>, string?]
                let name = nameOrValuesName as string;
                if (!name) {
                    name = TimeSeriesOperations.getTimeSeriesName(timeSeriesEntryClassOrName, this._store.conventions);
                }

                const mapping = TimeSeriesValuesHelper.getFieldsMapping(timeSeriesEntryClassOrName);
                if (!mapping) {
                    throwError("InvalidOperationException", TimeSeriesOperations.getTimeSeriesName(timeSeriesEntryClassOrName, this._store.conventions) + " must contain "); //TODO:
                }

                const collection = this._store.conventions.findCollectionName(collectionClass);
                const valueNames = mapping.map(x => x.name);
                await this._registerInternal(collection, name, valueNames);
            }
        }
    }

    private async _registerInternal(collection: string, name: string, valueNames: string[]): Promise<void> {
        const parameters: ConfigureTimeSeriesValueNamesParameters = {
            collection,
            timeSeries: name,
            valueNames,
            update: true
        };

        const command = new ConfigureTimeSeriesValueNamesOperation(parameters);
        await this._executor.send(command);
    }

    /**
     * Set rollup and retention policy
     * @param collectionClass Collection class
     * @param name Policy name
     * @param aggregation Aggregation time
     * @param retention Retention time
     */
    public async setPolicy<TCollection>(collectionClass: ClassConstructor<TCollection>, name: string, aggregation: TimeValue, retention: TimeValue): Promise<void>;
    /**
     * Set rollup and retention policy
     * @param collection Collection name
     * @param name Policy name
     * @param aggregation Aggregation time
     * @param retention Retention time
     */
    public async setPolicy<TCollection>(collection: string, name: string, aggregation: TimeValue, retention: TimeValue): Promise<void>;
    public async setPolicy<TCollection>(collectionNameOrClass: string | ClassConstructor<TCollection>, name: string, aggregation: TimeValue, retention: TimeValue): Promise<void> {
        const collection = TypeUtil.isString(collectionNameOrClass) ? collectionNameOrClass : this._store.conventions.findCollectionName(collectionNameOrClass);

        const p = new TimeSeriesPolicy(name, aggregation, retention);
        await this._executor.send(new ConfigureTimeSeriesPolicyOperation(collection, p));
    }

    /**
     * Set raw retention policy
     * @param collectionClass Collection class
     * @param retention Retention time
     */
    public async setRawPolicy<TCollection>(collectionClass: ClassConstructor<TCollection>, retention: TimeValue): Promise<void>;
    /**
     * Set raw retention policy
     * @param collection Collection name
     * @param retention Retention time
     */
    public async setRawPolicy(collection: string, retention: TimeValue): Promise<void>;
    public async setRawPolicy<TCollection>(collectionOrClass: string | ClassConstructor<TCollection>, retention: TimeValue): Promise<void> {
        const collection = TypeUtil.isString(collectionOrClass) ? collectionOrClass : this._store.conventions.findCollectionName(collectionOrClass);
        const p = new RawTimeSeriesPolicy(retention);
        await this._executor.send(new ConfigureRawTimeSeriesPolicyOperation(collection, p));
    }

    /**
     * Remove policy
     * @param collection Collection name
     * @param name Policy name
     */
    public async removePolicy(collection: string, name: string): Promise<void>;
    /**
     * Remove policy
     * @param clazz Collection class
     * @param name Policy name
     */
    public async removePolicy<TCollection>(clazz: ClassConstructor<TCollection>, name: string): Promise<void>;
    public async removePolicy<TCollection>(clazzOrCollection: ClassConstructor<TCollection> | string, name: string): Promise<void> {
        const collection = TypeUtil.isString(clazzOrCollection) ? clazzOrCollection : this._store.conventions.findCollectionName(clazzOrCollection);

        await this._executor.send(new RemoveTimeSeriesPolicyOperation(collection, name));
    }

    public static getTimeSeriesName<TTimeSeriesEntry>(clazz: ClassConstructor<TTimeSeriesEntry>, conventions: DocumentConventions) {
        return conventions.findCollectionName(clazz);
    }

    public forDatabase(database: string): TimeSeriesOperations {
        if (StringUtil.equalsIgnoreCase(database, this._database)) {
            return this;
        }

        return new TimeSeriesOperations(this._store, database);
    }

}
