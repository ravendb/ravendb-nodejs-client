import { DocumentConventions } from "../Conventions/DocumentConventions";
import { QueryResult } from "../Queries/QueryResult";

export interface QueryEventsEmitter {
 
    on(eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): this;
    on(eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): this;

    removeListener(eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): this;
    removeListener(eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): this;

    emit(eventName: "beforeQueryExecuted", eventArgs: IndexQuery);
    emit(eventName: "afterQueryExecuted", eventArgs: QueryResult);
}
}

export interface IQueryBase {

    /**
     * Gets the document convention from the query session
     * @return document conventions
     */
    conventions: DocumentConventions;

    //TBD void InvokeAfterStreamExecuted(BlittableJsonReaderObject result);

    /**
     * Disables caching for query results.
     * @return Query instance
     */
    noCaching(): this;

    /**
     * Disables tracking for queried entities by Raven's Unit of Work.
     * Usage of this option will prevent holding query results in memory.
     * @return Query instance
     */
    noTracking(): this;

    //TBD TSelf showTimings();

    /**
     * Skips the specified count.
     * @param count Items to skip
     * @return Query instance
     */
    skip(count: number): this;

    /**
     * Provide statistics about the query, such as total count of matching records
     * @param stats Output parameter for query stats
     * @return Query instance
     */
    statistics(statsCallback: (stats: QueryStatistics) => void): this;

    /**
     * Takes the specified count.
     * @param count Amount of items to take
     * @return Query instance
     */
    take(count: number): this;

    /**
     * Select the default operator to use for this query
     * @param queryOperator Query operator to use
     * @return Query instance
     */
    usingDefaultOperator(queryOperator: QueryOperator): this;

    /**
     * EXPERT ONLY: Instructs the query to wait for non stale results for the specified wait timeout.
     * This shouldn't be used outside of unit tests unless you are well aware of the implications
     * @return Query instance
     */
    waitForNonStaleResults(): this;

    /**
     * EXPERT ONLY: Instructs the query to wait for non stale results for the specified wait timeout.
     * This shouldn't be used outside of unit tests unless you are well aware of the implications
     * @param waitTimeout Max wait timeout in ms
     * @return Query instance
     */
    waitForNonStaleResults(waitTimeout: number): this;

    /**
     * Create the index query object for this query
     * @return index query
     */
    indexQuery: IndexQuery;

    /**
     * Add a named parameter to the query
     * @param name Parameter name
     * @param value Parameter value
     * @return Query instance
     */
    addParameter(name: string, value: object): this;
}
