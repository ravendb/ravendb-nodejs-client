import { QueryOperation } from "./Operations/QueryOperation";
import { IndexQuery } from "../Queries/IndexQuery";
import { QueryResult } from "../Queries/QueryResult";
import { ValueCallback } from "../../Types/Callbacks";
import { QueryTimings } from "../Queries/Timings/QueryTimings";
import { ProjectionBehavior } from "../Queries/ProjectionBehavior";
import { AbstractDocumentQuery } from "./AbstractDocumentQuery";

export interface IDocumentQueryCustomization {

    /**
     * Get the raw query operation that will be sent to the server
     */
    getQueryOperation(): QueryOperation;

    /**
     * Get current query
     */
    getQuery(): AbstractDocumentQuery<any, any>;

    /**
     * Allow you to modify the index query before it is executed
     */
    on(eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;

    /**
     * Callback to get the results of the query
     */
    on(eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;

    once(eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;

    once(eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;

    /**
     * Allow you to modify the index query before it is executed
     */
    removeListener(
        eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;

    /**
     * Callback to get the results of the query
     */
    removeListener(
        eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;

    //TBD IDocumentQueryCustomization AfterStreamExecutedCallback

    /**
     * Disables caching for query results.
     */
    noCaching(): IDocumentQueryCustomization;

    /**
     * Disables tracking for queried entities by Raven's Unit of Work.
     * Usage of this option will prevent holding query results in memory.
     */
    noTracking(): IDocumentQueryCustomization;

    /**
     * Disables tracking for queried entities by Raven's Unit of Work.
     * Usage of this option will prevent holding query results in memory.
     */
    randomOrdering(): IDocumentQueryCustomization;

    /**
     *  Order the search results randomly using the specified seed
     *  this is useful if you want to have repeatable random queries
     */
    randomOrdering(seed: string): IDocumentQueryCustomization;

    //TBD IDocumentQueryCustomization CustomSortUsing(string typeName);
    //TBD IDocumentQueryCustomization CustomSortUsing(string typeName, bool descending);
    //TBD IDocumentQueryCustomization ShowTimings();

    /**
     * Instruct the query to wait for non stale results.
     * This shouldn't be used outside of unit tests unless you are well aware of the implications
     */
    waitForNonStaleResults(): IDocumentQueryCustomization;

    /**
     * Instruct the query to wait for non stale results.
     * This shouldn't be used outside of unit tests unless you are well aware of the implications
     */
    waitForNonStaleResults(waitTimeout: number): IDocumentQueryCustomization;

    projection(projectionBehavior: ProjectionBehavior): IDocumentQueryCustomization;

    timings(timings: ValueCallback<QueryTimings>): IDocumentQueryCustomization;
}
