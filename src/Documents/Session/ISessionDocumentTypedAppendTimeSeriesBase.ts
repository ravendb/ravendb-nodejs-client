import { TypedTimeSeriesEntry } from "./TimeSeries/TypedTimeSeriesEntry";

export interface ISessionDocumentTypedAppendTimeSeriesBase<T extends object> {
    append(timestamp: Date, entry: T): void;
    append(timestamp: Date, entry: T, tag: string): void;
    append(entry: TypedTimeSeriesEntry<T>): void;
}
