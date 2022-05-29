import { ILazyOperation } from "./ILazyOperation";
import { QueryResult } from "../../../Queries/QueryResult";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { QueryCommand } from "../../../Commands/QueryCommand";
import { stringToReadable } from "../../../../Utility/StreamUtil";
import { DocumentConventions } from "../../../Conventions/DocumentConventions";
import { IndexQuery, writeIndexQuery } from "../../../Queries/IndexQuery";
import { SuggestionsResponseObject } from "../../../../Types";
import { InMemoryDocumentSessionOperations } from "../../InMemoryDocumentSessionOperations";

export class LazySuggestionQueryOperation implements ILazyOperation {

    // eslint-disable-next-line @typescript-eslint/ban-types
    private _result: Object;
    private _queryResult: QueryResult;
    private _requiresRetry: boolean;

    private readonly _session: InMemoryDocumentSessionOperations;
    private readonly _indexQuery: IndexQuery;
    private readonly _invokeAfterQueryExecuted: (result: QueryResult) => void;
    private readonly _processResults:
        (result: QueryResult) => SuggestionsResponseObject;

    public constructor(session: InMemoryDocumentSessionOperations, indexQuery: IndexQuery,
                       invokeAfterQueryExecuted: (result: QueryResult) => void,
                       processResults: (result: QueryResult)
                           => SuggestionsResponseObject) {
        this._session = session;
        this._indexQuery = indexQuery;
        this._invokeAfterQueryExecuted = invokeAfterQueryExecuted;
        this._processResults = processResults;
    }

    public createRequest(): GetRequest {
        const request = new GetRequest();
        request.url = "/queries";
        request.method = "POST";
        request.query = "?queryHash=" + this._indexQuery.getQueryHash(this._session.conventions.objectMapper);
        request.body = writeIndexQuery(this._session.conventions, this._indexQuery);

        return request;
    }

    public get result(): any {
        return this._result;
    }

    public set result(result) {
        this._result = result;
    }

    public get queryResult(): QueryResult {
        return this._queryResult;
    }

    public set queryResult(queryResult) {
        this._queryResult = queryResult;
    }

    public get requiresRetry() {
        return this._requiresRetry;
    }

    public set requiresRetry(result) {
        this._requiresRetry = result;
    }

    public async handleResponseAsync(response: GetResponse) {
        if (response.forceRetry) {
            this._result = null;
            this._requiresRetry = true;
            return;
        }

        const result = await QueryCommand.parseQueryResultResponseAsync(
            stringToReadable(response.result), this._session.conventions, false);

        this._handleResponse(result);
    }

    private _handleResponse(queryResult: QueryResult) {
        this._result = this._processResults(queryResult);
        this._queryResult = queryResult;
    }
}
