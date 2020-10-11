import { TypedTimeSeriesRollupEntry } from "./TimeSeries/TypedTimeSeriesRollupEntry";

export interface ISessionDocumentRollupTypedAppendTimeSeriesBase<T extends object> {
    append(entry: TypedTimeSeriesRollupEntry<T>): void;
}
