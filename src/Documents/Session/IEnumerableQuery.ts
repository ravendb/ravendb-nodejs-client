export interface IEnumerableQuery<T extends object> {

    /**
     * Materialize query, executes request and returns with results
     */
    all(): Promise<T[]>;
}
