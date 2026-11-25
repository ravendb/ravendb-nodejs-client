import { Readable } from "node:stream";
import { ISessionDocumentDeleteTimeSeriesBase } from "./ISessionDocumentDeleteTimeSeriesBase.js";
import { TimeSeriesEntry } from "./TimeSeries/TimeSeriesEntry.js";
import { ITimeSeriesIncludeBuilder } from "./Loaders/ITimeSeriesIncludeBuilder.js";


export interface ISessionDocumentIncrementalTimeSeries extends ISessionDocumentDeleteTimeSeriesBase {
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

    increment(timestamp: Date, values: number[]): void;
    increment(values: number[]): void;
    increment(timestamp: Date, value: number): void;
    increment(value: number): void;

    /**
     * Streams the entries between from and to (inclusive, default: all), with timestamps shifted by offset milliseconds.
     */
    stream(from?: Date, to?: Date, offset?: number): Promise<Readable>;
}
