export interface IEnumerableQuery<T> {

    /**
     * Materialize query, executes request and returns with results
     * @return results as list
     */
    toList(): Promise<T[]>;
}