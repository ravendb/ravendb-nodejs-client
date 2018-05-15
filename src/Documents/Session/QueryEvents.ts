import { IndexQuery } from "../Queries/IndexQuery";
import { QueryResult } from "../Queries/QueryResult";

export interface QueryEventsEmitter {

    on(eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): this;
    on(eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): this;

    removeListener(eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): this;
    removeListener(eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): this;

    emit(eventName: "beforeQueryExecuted", eventArgs: IndexQuery);
    emit(eventName: "afterQueryExecuted", eventArgs: QueryResult);
}
