import { ILazyOperation } from "./ILazyOperation";
import { QueryResult } from "../../../Queries/QueryResult";
import { DocumentConventions } from "../../../Conventions/DocumentConventions";
import { IndexQuery, writeIndexQuery } from "../../../Queries/IndexQuery";
import { FacetResultObject, AggregationQueryBase } from "../../../Queries/Facets/AggregationQueryBase";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { FacetQueryCommand } from "../../../Commands/FacetQueryCommand";
import { stringToReadable } from "../../../../Utility/StreamUtil";
import { InMemoryDocumentSessionOperations } from "../../InMemoryDocumentSessionOperations";

export class LazyAggregationQueryOperation implements ILazyOperation {

    private readonly _session: InMemoryDocumentSessionOperations;
    private readonly _indexQuery: IndexQuery;
    private readonly _parent: AggregationQueryBase;
    private readonly _processResults:
        (queryResult: QueryResult) => FacetResultObject;

    public constructor(
        session: InMemoryDocumentSessionOperations,
        indexQuery: IndexQuery,
        parent: AggregationQueryBase,
        processResults: (queryResult: QueryResult) => FacetResultObject) {
        this._session = session;
        this._indexQuery = indexQuery;
        this._processResults = processResults;
        this._parent = parent;
    }

    public createRequest(): GetRequest {
        const request = new GetRequest();
        request.url = "/queries";
        request.method = "POST";
        request.query = "?queryHash=" + this._indexQuery.getQueryHash(this._session.conventions.objectMapper);
        request.body = writeIndexQuery(this._session.conventions, this._indexQuery);
        return request;
    }

    private _result: any;
    private _queryResult: QueryResult;
    private _requiresRetry: boolean;

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

    public async handleResponseAsync(response: GetResponse): Promise<void> {
        if (response.forceRetry) {
            this._result = null;
            this._requiresRetry = true;
            return;
        }

        const result = await FacetQueryCommand.parseQueryResultResponseAsync(
            stringToReadable(response.result), this._session.conventions, false);
        this._handleResponse(result);
    }

    private _handleResponse(queryResult: QueryResult): void {
        this.result = this._processResults(queryResult);
        this.queryResult = queryResult;
    }
}
