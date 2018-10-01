import { ILazyOperation } from "./ILazyOperation";
import { QueryResult } from "../../../Queries/QueryResult";
import { DocumentConventions, IndexQuery, SuggestionsResponseObject, writeIndexQuery } from "../../../..";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { QueryCommand } from "../../../Commands/QueryCommand";
import { stringToReadable } from "../../../../Utility/StreamUtil";

export class LazySuggestionQueryOperation implements ILazyOperation {

    private _result: Object;
    private _queryResult: QueryResult;
    private _requiresRetry: boolean;

    private readonly _conventions: DocumentConventions;
    private readonly _indexQuery: IndexQuery;
    private readonly _invokeAfterQueryExecuted: (result: QueryResult) => void;
    private readonly _processResults:
        (result: QueryResult, conventions: DocumentConventions) => SuggestionsResponseObject;

    public constructor(conventions: DocumentConventions, indexQuery: IndexQuery,
                       invokeAfterQueryExecuted: (result: QueryResult) => void,
                       processResults: (result: QueryResult, conventions: DocumentConventions)
                           => SuggestionsResponseObject) {
        this._conventions = conventions;
        this._indexQuery = indexQuery;
        this._invokeAfterQueryExecuted = invokeAfterQueryExecuted;
        this._processResults = processResults;
    }

    public createRequest(): GetRequest {
        const request = new GetRequest();
        request.url = "/queries";
        request.method = "POST";
        request.query = "?queryHash=" + this._indexQuery.getQueryHash();
        request.body = writeIndexQuery(this._conventions, this._indexQuery);

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
            stringToReadable(response.result), this._conventions, false, this._conventions.entityObjectMapper);

        this._handleResponse(result);
    }

    private _handleResponse(queryResult: QueryResult) {
        if (this._invokeAfterQueryExecuted) {
            this._invokeAfterQueryExecuted(queryResult);
        }

        this._result = this._processResults(queryResult, this._conventions);
        this._queryResult = queryResult;
    }
}
