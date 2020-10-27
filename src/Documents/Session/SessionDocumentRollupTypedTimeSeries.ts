import { SessionTimeSeriesBase } from "./SessionTimeSeriesBase";
import { ISessionDocumentRollupTypedTimeSeries } from "./ISessionDocumentRollupTypedTimeSeries";
import { ClassConstructor } from "../../Types";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { TypedTimeSeriesRollupEntry } from "./TimeSeries/TypedTimeSeriesRollupEntry";
import { TypeUtil } from "../../Utility/TypeUtil";

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
        const results = await this.getInternal(from, to, start, pageSize);

        return results
            .map(x => TypedTimeSeriesRollupEntry.fromEntry(x, this._clazz));
    }

    public append(entry: TypedTimeSeriesRollupEntry<T>) {
        const values = entry.getValuesFromMembers();
        this._appendInternal(entry.timestamp, values, entry.tag);
    }
}