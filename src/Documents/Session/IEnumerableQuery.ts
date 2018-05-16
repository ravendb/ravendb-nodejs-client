export interface IEnumerableQuery<T> {

    // counterpart of JVM's toList() method
    /**
     * Materialize query, executes request and returns with results
     * @return results as list
     */
    all(): Promise<T[]>;

}
