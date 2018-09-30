import { ILazyOperation } from "./ILazyOperation";
import { QueryResult } from "../../../Queries/QueryResult";
import { DocumentConventions } from "../../../Conventions/DocumentConventions";
import { IndexQuery, writeIndexQuery } from "../../../Queries/IndexQuery";
import { FacetResultObject, AggregationQueryBase } from "../../../Queries/Facets/AggregationQueryBase";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { FacetQueryCommand } from "../../../Commands/FacetQueryCommand";
import { stringToReadable } from "../../../../Utility/StreamUtil";

export class LazyAggregationQueryOperation implements ILazyOperation {

    private readonly _conventions: DocumentConventions;
    private readonly _indexQuery: IndexQuery;
    private readonly _parent: AggregationQueryBase;
    private readonly _processResults:
        (queryResult: QueryResult, conventions: DocumentConventions) => FacetResultObject;

    public constructor(
        conventions: DocumentConventions,
        indexQuery: IndexQuery,
        parent: AggregationQueryBase,
        processResults: (queryResult: QueryResult, conventions: DocumentConventions) => FacetResultObject) {
        this._conventions = conventions;
        this._indexQuery = indexQuery;
        this._processResults = processResults;
        this._parent = parent;
    }

    public createRequest(): GetRequest {
        const request = new GetRequest();
        request.url = "/queries";
        request.method = "POST";
        request.query = "?queryHash=" + this._indexQuery.getQueryHash();
        request.body = writeIndexQuery(this._conventions, this._indexQuery);
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
            stringToReadable(response.result), this._conventions, false, this._conventions.entityObjectMapper);
        this._handleResponse(result);
    }

    private _handleResponse(queryResult: QueryResult): void {
        this._parent.emit("afterQueryExecuted", queryResult);
        this.result = this._processResults(queryResult, this._conventions);
        this.queryResult = queryResult;
    }
}
