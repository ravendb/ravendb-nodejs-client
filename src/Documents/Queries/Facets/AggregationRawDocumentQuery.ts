import { AggregationQueryBase } from "./AggregationQueryBase";
import { IRawDocumentQuery } from "../../Session/IRawDocumentQuery";
import { InMemoryDocumentSessionOperations } from "../../Session/InMemoryDocumentSessionOperations";
import { throwError } from "../../../Exceptions";
import { IndexQuery } from "../IndexQuery";
import { QueryResult } from "../QueryResult";

export class AggregationRawDocumentQuery<T extends object> extends AggregationQueryBase {
    private readonly _source: IRawDocumentQuery<T>;


    constructor(source: IRawDocumentQuery<T>, session: InMemoryDocumentSessionOperations) {
        super(session);

        this._source = source;

        if (!source) {
            throwError("InvalidArgumentException", "Source cannot be null");
        }
    }

    protected _getIndexQuery(updateAfterQueryExecuted?: boolean): IndexQuery {
        return this._source.getIndexQuery();
    }

    public emit(eventName: "afterQueryExecuted", queryResult: QueryResult) {
        if (eventName === "afterQueryExecuted") {
            this._source.emit(eventName, queryResult);
        }
    }
}