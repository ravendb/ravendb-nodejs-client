import { ISessionDocumentRollupTypedAppendTimeSeriesBase } from "./ISessionDocumentRollupTypedAppendTimeSeriesBase";
import { ISessionDocumentDeleteTimeSeriesBase } from "./ISessionDocumentDeleteTimeSeriesBase";
import { TypedTimeSeriesRollupEntry } from "./TimeSeries/TypedTimeSeriesRollupEntry";

export interface ISessionDocumentRollupTypedTimeSeries<TValues extends object>
    extends ISessionDocumentRollupTypedAppendTimeSeriesBase<TValues>, ISessionDocumentDeleteTimeSeriesBase {

    get(): Promise<TypedTimeSeriesRollupEntry<TValues>[]>;
    get(from: Date, to: Date): Promise<TypedTimeSeriesRollupEntry<TValues>[]>;
    get(from: Date, to: Date, start: number): Promise<TypedTimeSeriesRollupEntry<TValues>[]>;
    get(from: Date, to: Date, start: number, pageSize: number): Promise<TypedTimeSeriesRollupEntry<TValues>[]>;
}