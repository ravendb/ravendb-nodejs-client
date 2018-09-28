import { QueryOperation } from "./Operations/QueryOperation";
import { IndexQuery } from "../Queries/IndexQuery";
import { QueryResult } from "../Queries/QueryResult";
import { QueryEventsEmitter } from "./QueryEvents";

export interface IDocumentQueryCustomization {

    /**
     * Get the raw query operation that will be sent to the server
     */
    getQueryOperation(): QueryOperation;

    /*
    * Allow you to modify the index query before it is executed
    * @param action action to call
    * @return customization object
    */
    on(eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;

    /*
    * Callback to get the results of the query
    * @param action action to call
    * @return customization object
    */
    on(eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;

    once(eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;
    once(eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;

     /*
     * Allow you to modify the index query before it is executed
     * @param action action to call
     * @return customization object
     */
    removeListener(
        eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;

    /*
    * Callback to get the results of the query
    * @param action action to call
    * @return customization object
    */
    removeListener(
        eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;

    //TBD IDocumentQueryCustomization AfterStreamExecutedCallback

    /*
    * Disables caching for query results.
    * @return customization object
    */
    noCaching(): IDocumentQueryCustomization;

    /*
    * Disables tracking for queried entities by Raven's Unit of Work.
    * Usage of this option will prevent holding query results in memory.
    * @return customization object
    */
    noTracking(): IDocumentQueryCustomization;

    /*
    * Disables tracking for queried entities by Raven's Unit of Work.
    * Usage of this option will prevent holding query results in memory.
    * @return customization object
    */
    randomOrdering(): IDocumentQueryCustomization;

    /*
    *  Order the search results randomly using the specified seed
    *  this is useful if you want to have repeatable random queries
    * @return customization object
    */
    randomOrdering(seed: string): IDocumentQueryCustomization;

    //TBD IDocumentQueryCustomization CustomSortUsing(string typeName);
    //TBD IDocumentQueryCustomization CustomSortUsing(string typeName, bool descending);
    //TBD IDocumentQueryCustomization ShowTimings();

    /*
    * Instruct the query to wait for non stale results.
    * This shouldn't be used outside of unit tests unless you are well aware of the implications
    * @return customization object
    */
    waitForNonStaleResults(): IDocumentQueryCustomization;

    /*
    * Instruct the query to wait for non stale results.
    * This shouldn't be used outside of unit tests unless you are well aware of the implications
    * @param waitTimeout Maximum time to wait for index query results to become non-stale before exception is thrown. 
    *                    Default: 15 seconds.
    * @return customization object
    */
    waitForNonStaleResults(waitTimeout: number): IDocumentQueryCustomization;
}
