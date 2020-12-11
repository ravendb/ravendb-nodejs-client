import { ISessionDocumentDeleteTimeSeriesBase } from "./ISessionDocumentDeleteTimeSeriesBase";
import { ISessionDocumentTypedAppendTimeSeriesBase } from "./ISessionDocumentTypedAppendTimeSeriesBase";
import { TypedTimeSeriesEntry } from "./TimeSeries/TypedTimeSeriesEntry";

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
}
