import { QueryOperator } from "../Queries/QueryOperator.js";
import { IndexQuery } from "../Queries/IndexQuery.js";
import { QueryStatistics } from "./QueryStatistics.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { QueryEventsEmitter } from "./QueryEvents.js";
import { ValueCallback } from "../../Types/Callbacks.js";
import { QueryTimings } from "../Queries/Timings/QueryTimings.js";

export interface IQueryBase<T, TSelf extends IQueryBase<T, TSelf>> extends QueryEventsEmitter {

    /**
     * Gets the document convention from the query session
     */
    conventions: DocumentConventions;

    /**
     * Disables caching for query results.
     */
    noCaching(): TSelf;

    /**
     * Disables tracking for queried entities by Raven's Unit of Work.
     * Usage of TSelf option will prevent holding query results in memory.
     */
    noTracking(): TSelf;

    /**
     *  Enables calculation of timings for various parts of a query (Lucene search, loading documents, transforming
     *  results). Default: false
     * @param timings Reference to output parameter
     * @return Query instance
     */
    timings(timings: ValueCallback<QueryTimings>): TSelf;

    /**
     * Provide statistics about the query, such as total count of matching records
     */
    statistics(statsCallback: (stats: QueryStatistics) => void): TSelf;

    /**
     * Select the default operator to use for TSelf query
     */
    usingDefaultOperator(queryOperator: QueryOperator): TSelf;

    /**
     * EXPERT ONLY: Instructs the query to wait for non stale results for the specified wait timeout.
     * TSelf shouldn't be used outside of unit tests unless you are well aware of the implications
     */
    waitForNonStaleResults(): TSelf;

    /**
     * EXPERT ONLY: Instructs the query to wait for non stale results for the specified wait timeout.
     * TSelf shouldn't be used outside of unit tests unless you are well aware of the implications
     */
    waitForNonStaleResults(waitTimeout: number): TSelf;

    /**
     * Create the index query object for TSelf query
     */
    getIndexQuery(): IndexQuery;

    /**
     * Add a named parameter to the query
     */
    addParameter(name: string, value: any): TSelf;

    /**
     * Attaches a user-defined tag that is forwarded to the server as the `tag`
     * query-string parameter. Useful for identifying query sources in server logs
     * and monitoring dashboards. The tag does not affect query results or caching.
     */
    withTag(tag: string): TSelf;
}
