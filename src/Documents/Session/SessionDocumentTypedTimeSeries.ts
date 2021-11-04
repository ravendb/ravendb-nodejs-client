import { SessionTimeSeriesBase } from "./SessionTimeSeriesBase";
import { ISessionDocumentTypedTimeSeries } from "./ISessionDocumentTypedTimeSeries";
import { ClassConstructor } from "../../Types";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { TypedTimeSeriesEntry } from "./TimeSeries/TypedTimeSeriesEntry";
import { TypeUtil } from "../../Utility/TypeUtil";
import { TimeSeriesValuesHelper } from "./TimeSeries/TimeSeriesValuesHelper";

export class SessionDocumentTypedTimeSeries<T extends object> extends SessionTimeSeriesBase implements ISessionDocumentTypedTimeSeries<T> {
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
        if (TypeUtil.isNullOrUndefined(startOrFrom)) {
            // get()
            return this._getTyped(null, null, 0, TypeUtil.MAX_INT32)
        } else if (TypeUtil.isNumber(startOrFrom)) {
            // get(start: number, pageSize: number)
            return this._getTyped(null, null, startOrFrom, toOrPageSize as number);
        } else {
            return this._getTyped(startOrFrom, toOrPageSize as Date, start ?? 0, pageSize ?? TypeUtil.MAX_INT32);
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
}
