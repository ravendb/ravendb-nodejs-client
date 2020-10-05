
export interface ISessionDocumentAppendTimeSeriesBase {
    /**
     * Append the the values to the times series at the provided time stamp
     * @param timestamp date
     * @param values values
     */
    append(timestamp: Date, values: number[]);

    /**
     * Append the the values (and optional tag) to the times series at the provided time stamp
     * @param timestamp date
     * @param values values
     * @param tag optional tag
     */
    append(timestamp: Date, values: number[], tag: string);

    /**
     * Append a single value to the times series at the provided time stamp
     * @param timestamp date
     * @param value value
     */
    append(timestamp: Date, value: number);

    /**
     * Append a single value (and optional tag) to the times series at the provided time stamp
     * @param timestamp date
     * @param value value
     * @param tag optional tag
     */
    append(timestamp: Date, value: number, tag: string);
}