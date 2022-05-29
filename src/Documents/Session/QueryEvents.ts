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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface QueryEventsEmitter
    extends TypedEventEmitter<QueryEvents> {
}
