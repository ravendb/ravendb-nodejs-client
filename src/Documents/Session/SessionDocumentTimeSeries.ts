import { SessionTimeSeriesBase } from "./SessionTimeSeriesBase";
import { ISessionDocumentTimeSeries } from "./ISessionDocumentTimeSeries";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { TimeSeriesEntry } from "./TimeSeries/TimeSeriesEntry";
import { TypeUtil } from "../../Utility/TypeUtil";

export class SessionDocumentTimeSeries extends SessionTimeSeriesBase implements ISessionDocumentTimeSeries {

    public constructor(session: InMemoryDocumentSessionOperations, entity: any, name: string)
    public constructor(session: InMemoryDocumentSessionOperations, documentId: string, name: string)
    public constructor(session: InMemoryDocumentSessionOperations, documentIdOrEntity: string | any, name: string) {
        super(session, documentIdOrEntity, name);
    }

    public get(): Promise<TimeSeriesEntry[]>;
    public get(start: number, pageSize: number): Promise<TimeSeriesEntry[]>;
    public get(from: Date, to: Date): Promise<TimeSeriesEntry[]>;
    public get(from: Date, to: Date, start: number): Promise<TimeSeriesEntry[]>;
    public get(from: Date, to: Date, start: number, pageSize: number): Promise<TimeSeriesEntry[]>;
    public get(startOrFrom?: number | Date, toOrPageSize?: number | Date, start?: number, pageSize?: number) {
        if (TypeUtil.isNullOrUndefined(startOrFrom)) {
            // get()
            return this.getInternal(null, null, 0, TypeUtil.MAX_INT32);
        } else if (TypeUtil.isNumber(startOrFrom)) {
            // get(start: number, pageSize: number)
            return this.getInternal(null, null, startOrFrom, toOrPageSize as number);
        } else {
            return this.getInternal(startOrFrom, toOrPageSize as Date, start ?? 0, pageSize ?? TypeUtil.MAX_INT32);
        }
    }
}
