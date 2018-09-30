import {QueryOperator} from "../Queries/QueryOperator";
import {IndexQuery} from "../Queries/IndexQuery";
import {QueryStatistics} from "./QueryStatistics";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { QueryEventsEmitter } from "../Session/QueryEvents";

export interface IQueryBase<T, TSelf extends IQueryBase<T, TSelf>> extends QueryEventsEmitter {

    /**
     * Gets the document convention from the query session
     * @return document conventions
     */
    conventions: DocumentConventions;

    /**
     * Disables caching for query results.
     * @return Query instance
     */
    noCaching(): TSelf;

    /**
     * Disables tracking for queried entities by Raven's Unit of Work.
     * Usage of TSelf option will prevent holding query results in memory.
     * @return Query instance
     */
    noTracking(): TSelf;

    //TBD 4.1 TSelf showTimings();

    /**
     * Skips the specified count.
     * @param count Items to skip
     * @return Query instance
     */
    skip(count: number): TSelf;

    /**
     * Provide statistics about the query, such as total count of matching records
     * @param stats Output parameter for query stats
     * @return Query instance
     */
    statistics(statsCallback: (stats: QueryStatistics) => void): TSelf;

    /**
     * Takes the specified count.
     * @param count Amount of items to take
     * @return Query instance
     */
    take(count: number): TSelf;

    /**
     * Select the default operator to use for TSelf query
     * @param queryOperator Query operator to use
     * @return Query instance
     */
    usingDefaultOperator(queryOperator: QueryOperator): TSelf;

    /**
     * EXPERT ONLY: Instructs the query to wait for non stale results for the specified wait timeout.
     * TSelf shouldn't be used outside of unit tests unless you are well aware of the implications
     * @return Query instance
     */
    waitForNonStaleResults(): TSelf;

    /**
     * EXPERT ONLY: Instructs the query to wait for non stale results for the specified wait timeout.
     * TSelf shouldn't be used outside of unit tests unless you are well aware of the implications
     * @param waitTimeout Max wait timeout in ms
     * @return Query instance
     */
    waitForNonStaleResults(waitTimeout: number): TSelf;

    /**
     * Create the index query object for TSelf query
     * @return index query
     */
    getIndexQuery(): IndexQuery;

    /**
     * Add a named parameter to the query
     * @param name Parameter name
     * @param value Parameter value
     * @return Query instance
     */
    addParameter(name: string, value: any): TSelf;
}
