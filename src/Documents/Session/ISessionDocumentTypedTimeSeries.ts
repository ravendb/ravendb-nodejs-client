import { Readable } from "node:stream";
import { ISessionDocumentDeleteTimeSeriesBase } from "./ISessionDocumentDeleteTimeSeriesBase.js";
import { ISessionDocumentTypedAppendTimeSeriesBase } from "./ISessionDocumentTypedAppendTimeSeriesBase.js";
import { TypedTimeSeriesEntry } from "./TimeSeries/TypedTimeSeriesEntry.js";

export interface ISessionDocumentTypedTimeSeries<TValues extends object> extends ISessionDocumentTypedAppendTimeSeriesBase<TValues>,
    ISessionDocumentDeleteTimeSeriesBase {

    /**
     * Return the time series values for the provided range
     */
    get(): Promise<TypedTimeSeriesEntry<TValues>[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     */
    get(from: Date, to: Date): Promise<TypedTimeSeriesEntry<TValues>[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param start start
     */
    get(from: Date, to: Date, start: number): Promise<TypedTimeSeriesEntry<TValues>[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param start start
     * @param pageSize page size
     */
    get(from: Date, to: Date, start: number, pageSize: number): Promise<TypedTimeSeriesEntry<TValues>[]>;

    /**
     * Streams the entries between from and to (inclusive, default: all), with timestamps shifted by offset milliseconds.
     */
    stream(from?: Date, to?: Date, offset?: number): Promise<Readable>;
}
