import { Readable } from "node:stream";
/**
 * Time series synchronous session operations
 */
import { ISessionDocumentDeleteTimeSeriesBase } from "./ISessionDocumentDeleteTimeSeriesBase.js";
import { ISessionDocumentAppendTimeSeriesBase } from "./ISessionDocumentAppendTimeSeriesBase.js";
import { TimeSeriesEntry } from "./TimeSeries/TimeSeriesEntry.js";
import { ITimeSeriesIncludeBuilder } from "./Loaders/ITimeSeriesIncludeBuilder.js";

export interface ISessionDocumentTimeSeries extends ISessionDocumentAppendTimeSeriesBase, ISessionDocumentDeleteTimeSeriesBase {
    /**
     * Return all time series values
     */
    get(): Promise<TimeSeriesEntry[]>;

    /**
     * Return all time series values with paging
     * @param start start
     * @param pageSize page size
     */
    get(start: number, pageSize: number): Promise<TimeSeriesEntry[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     */
    get(from: Date, to: Date): Promise<TimeSeriesEntry[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param start start
     */
    get(from: Date, to: Date, start: number): Promise<TimeSeriesEntry[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param start start
     * @param pageSize page size
     */
    get(from: Date, to: Date, start: number, pageSize: number): Promise<TimeSeriesEntry[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param includes includes
     */
    get(from: Date, to: Date, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void): Promise<TimeSeriesEntry[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param includes includes
     * @param start start
     */
    get(from: Date, to: Date, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void, start: number): Promise<TimeSeriesEntry[]>;

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param includes includes
     * @param start start
     * @param pageSize page size
     */
    get(from: Date, to: Date, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void, start: number, pageSize: number): Promise<TimeSeriesEntry[]>;

    /**
     * Streams the entries between from and to (inclusive, default: all), with timestamps shifted by offset milliseconds.
     */
    stream(from?: Date, to?: Date, offset?: number): Promise<Readable>;
}
