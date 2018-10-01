import { IndexQuery } from "../Queries/IndexQuery";
import { QueryResult } from "../Queries/QueryResult";
import { TypedEventEmitter } from "../../Primitives/Events";

export interface StreamingQueryEvents {
    "afterStreamExecuted": object;
}

export interface QueryEvents extends StreamingQueryEvents {
    "beforeQueryExecuted": IndexQuery;
    "afterQueryExecuted": QueryResult;
}

export interface QueryEventsEmitter
    extends TypedEventEmitter<QueryEvents> {
}
