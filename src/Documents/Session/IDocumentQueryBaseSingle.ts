export interface IDocumentQueryBaseSingle<T> {
    //TBD  Lazy<int> CountLazily();

    /**
     * Returns first element or throws if sequence is empty.
     * @return first result
     */
    first(): Promise<T>;

    /**
     * Returns first element or throws if sequence is empty or contains more than one element.
     * @return single result or throws
     */
    single(): Promise<T>;

    /**
     * Gets the total count of records for this query
     * @return total count of records
     */
    count(): Promise<number>;

    //TBD Lazy<IEnumerable<T>> Lazily(Action<IEnumerable<T>> onEval);
}