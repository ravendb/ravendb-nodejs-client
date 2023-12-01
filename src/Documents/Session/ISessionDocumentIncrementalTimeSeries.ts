import { ISessionDocumentDeleteTimeSeriesBase } from "./ISessionDocumentDeleteTimeSeriesBase";
import { TimeSeriesEntry } from "./TimeSeries/TimeSeriesEntry";
import { ITimeSeriesIncludeBuilder } from "./Loaders/ITimeSeriesIncludeBuilder";


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
}
