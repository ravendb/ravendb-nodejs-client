import { SessionTimeSeriesBase } from "./SessionTimeSeriesBase";
import { ISessionDocumentTypedTimeSeries } from "./ISessionDocumentTypedTimeSeries";
import { ClassConstructor } from "../../Types";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { TypedTimeSeriesEntry } from "./TimeSeries/TypedTimeSeriesEntry";
import { TypeUtil } from "../../Utility/TypeUtil";
import { TimeSeriesValuesHelper } from "./TimeSeries/TimeSeriesValuesHelper";
import { ISessionDocumentTypedIncrementalTimeSeries } from "./ISessionDocumentTypedIncrementalTimeSeries";

export class SessionDocumentTypedTimeSeries<T extends object> extends SessionTimeSeriesBase
    implements ISessionDocumentTypedTimeSeries<T>, ISessionDocumentTypedIncrementalTimeSeries<T> {
    private readonly _clazz: ClassConstructor<T>;

    public constructor(session: InMemoryDocumentSessionOperations, entity: any, name: string, clazz: ClassConstructor<T>);
    public constructor(session: InMemoryDocumentSessionOperations, documentId: string, name: string, clazz: ClassConstructor<T>);
    public constructor(session: InMemoryDocumentSessionOperations, documentIdOrEntity: string | any, name: string, clazz: ClassConstructor<T>) {
        super(session, documentIdOrEntity, name);

        this._clazz = clazz;
    }

    public async get(): Promise<TypedTimeSeriesEntry<T>[]>;
    public async get(from: Date, to: Date): Promise<TypedTimeSeriesEntry<T>[]>;
    public async get(from: Date, to: Date, start: number): Promise<TypedTimeSeriesEntry<T>[]>;
    public async get(from: Date, to: Date, start: number, pageSize: number): Promise<TypedTimeSeriesEntry<T>[]>;
    public async get(startOrFrom?: number | Date, toOrPageSize?: number | Date, start?: number, pageSize?: number): Promise<TypedTimeSeriesEntry<T>[]> {
        if (TypeUtil.isNumber(startOrFrom)) {
            // get(start: number, pageSize: number)
            return this._getTyped(null, null, startOrFrom, toOrPageSize as number);
        } else {
            return this._getTyped(startOrFrom, toOrPageSize as Date, 0, TypeUtil.MAX_INT32);
        }
    }

    private async _getTyped(from: Date, to: Date, start: number, pageSize: number): Promise<TypedTimeSeriesEntry<T>[]> {
        if (this._notInCache(from, to)) {
            const entries = await this.getTimeSeriesAndIncludes(from, to, null, start, pageSize);
            if (!entries) {
                return null;
            }

            return entries.map(x => x.asTypedEntry(this._clazz));
        }

        const results = await this._getFromCache(from, to, null, start, pageSize);
        return results.map(x => x.asTypedEntry(this._clazz));
    }

    public append(timestamp: Date, entry: T): void;
    public append(timestamp: Date, entry: T, tag: string): void;
    public append(entry: TypedTimeSeriesEntry<T>): void;
    public append(entryOrTimestamp: TypedTimeSeriesEntry<T> | Date, entry?: T, tag?: string): void {
        if (entryOrTimestamp instanceof TypedTimeSeriesEntry) {
            this.append(entryOrTimestamp.timestamp, entryOrTimestamp.value, entryOrTimestamp.tag);
        } else {
            const values = TimeSeriesValuesHelper.getValues<T>(this._clazz, entry);
            this._appendInternal(entryOrTimestamp, values, tag);
        }
    }

    public increment(timestamp: Date, values: number[]): void;
    public increment(values: number[]): void;
    public increment(timestamp: Date, value: number): void;
    public increment(value: number): void;
    public increment(timestamp: Date, entry: T): void;
    public increment(entry: T): void;
    public increment(entryOrTimestampOrValuesOrValue: T | Date | number[] | number, valuesOrValueOrEntry?: number[] | number | T): void {
        if (entryOrTimestampOrValuesOrValue instanceof Date) {
            if (valuesOrValueOrEntry instanceof TypedTimeSeriesEntry) {
                const values = valuesOrValueOrEntry.values ?? [valuesOrValueOrEntry.value];
                return this.increment(valuesOrValueOrEntry.timestamp, values);
            } else if (TypeUtil.isNumber(valuesOrValueOrEntry)) {
                return this._incrementInternal(entryOrTimestampOrValuesOrValue, [valuesOrValueOrEntry]);
            } else if (TypeUtil.isArray(valuesOrValueOrEntry)) {
                return this._incrementInternal(entryOrTimestampOrValuesOrValue, valuesOrValueOrEntry);
            } else {
                const values = TimeSeriesValuesHelper.getValues(this._clazz, valuesOrValueOrEntry);
                return this._incrementInternal(entryOrTimestampOrValuesOrValue, values);
            }
        } else {
            if (entryOrTimestampOrValuesOrValue instanceof TypedTimeSeriesEntry) {
                const values = entryOrTimestampOrValuesOrValue.values ?? [entryOrTimestampOrValuesOrValue.value];
                return this.increment(entryOrTimestampOrValuesOrValue.timestamp, values);
            } else if (TypeUtil.isArray(entryOrTimestampOrValuesOrValue)) {
                return this._incrementInternal(new Date(), entryOrTimestampOrValuesOrValue);
            } else if (TypeUtil.isNumber(entryOrTimestampOrValuesOrValue)) {
                return this._incrementInternal(new Date(), [entryOrTimestampOrValuesOrValue]);
            } else {
                const values = TimeSeriesValuesHelper.getValues(this._clazz, entryOrTimestampOrValuesOrValue);
                return this._incrementInternal(new Date(), values);
            }
        }
    }
}
