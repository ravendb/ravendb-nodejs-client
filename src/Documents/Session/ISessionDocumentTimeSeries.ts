/**
 * Time series synchronous session operations
 */
import { ISessionDocumentDeleteTimeSeriesBase } from "./ISessionDocumentDeleteTimeSeriesBase";
import { ISessionDocumentAppendTimeSeriesBase } from "./ISessionDocumentAppendTimeSeriesBase";
import { TimeSeriesEntry } from "./TimeSeries/TimeSeriesEntry";
import { ITimeSeriesIncludeBuilder } from "./Loaders/ITimeSeriesIncludeBuilder";

// tslint:disable-next-line:no-unused-expression
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
    get(from: Date, to: Date, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void);

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param includes includes
     * @param start start
     */
    get(from: Date, to: Date, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void, start: number);

    /**
     * Return the time series values for the provided range
     * @param from range start
     * @param to range end
     * @param includes includes
     * @param start start
     * @param pageSize page size
     */
    get(from: Date, to: Date, includes: (includeBuilder: ITimeSeriesIncludeBuilder) => void, start: number, pageSize: number);

}