import { Readable } from "node:stream";
import { SessionTimeSeriesBase } from "./SessionTimeSeriesBase.js";
import { ISessionDocumentRollupTypedTimeSeries } from "./ISessionDocumentRollupTypedTimeSeries.js";
import { ClassConstructor } from "../../Types/index.js";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations.js";
import { TypedTimeSeriesRollupEntry } from "./TimeSeries/TypedTimeSeriesRollupEntry.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";

export class SessionDocumentRollupTypedTimeSeries<T extends object> extends SessionTimeSeriesBase implements ISessionDocumentRollupTypedTimeSeries<T> {

    private readonly _clazz: ClassConstructor<T>;

    public constructor(session: InMemoryDocumentSessionOperations, entity: any, name: string, clazz: ClassConstructor<T>);
    public constructor(session: InMemoryDocumentSessionOperations, documentId: string, name: string, clazz: ClassConstructor<T>);
    public constructor(session: InMemoryDocumentSessionOperations, documentIdOrEntity: string | any, name: string, clazz: ClassConstructor<T>) {
        super(session, documentIdOrEntity, name);

        this._clazz = clazz;
    }

    public async get(): Promise<TypedTimeSeriesRollupEntry<T>[]>;
    public async get(from: Date, to: Date): Promise<TypedTimeSeriesRollupEntry<T>[]>;
    public async get(from: Date, to: Date, start: number): Promise<TypedTimeSeriesRollupEntry<T>[]>;
    public async get(from: Date, to: Date, start: number, pageSize: number): Promise<TypedTimeSeriesRollupEntry<T>[]>
    public async get(from?: Date, to?: Date, start: number = 0, pageSize: number = TypeUtil.MAX_INT32): Promise<TypedTimeSeriesRollupEntry<T>[]> {
        if (this._notInCache(from, to)) {
            const results = await this.getTimeSeriesAndIncludes(from, to, null, start, pageSize);

            return results.map(x => TypedTimeSeriesRollupEntry.fromEntry(x, this._clazz));
        }

        const results = await this._getFromCache(from, to, null, start, pageSize);
        return results
            .map(x => TypedTimeSeriesRollupEntry.fromEntry(x, this._clazz));
    }

    public stream(from?: Date, to?: Date, offset?: number): Promise<Readable> {
        return this._streamEntries(from, to, offset, entry => TypedTimeSeriesRollupEntry.fromEntry(entry, this._clazz));
    }

    public append(entry: TypedTimeSeriesRollupEntry<T>) {
        const values = entry.getValuesFromMembers();
        this._appendInternal(entry.timestamp, values, entry.tag);
    }
}