
export interface ISessionDocumentDeleteTimeSeriesBase {

    /**
     * Delete all the values in the time series
     */
    delete(): void;

    /**
     * Delete the value in the time series in the specified time stamp
     * @param at date to remove
     */
    deleteAt(at: Date): void;

    /**
     * Delete all the values in the time series in the range of from .. to.
     * @param from range start
     * @param to range end
     */
    delete(from: Date, to: Date): void;
}