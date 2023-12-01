import { ILazyOperation } from "./ILazyOperation";
import { ObjectTypeDescriptor } from "../../../../Types";
import { QueryResult } from "../../../Queries/QueryResult";
import { QueryOperation } from "../QueryOperation";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { writeIndexQuery } from "../../../Queries/IndexQuery";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { QueryCommand } from "../../../Commands/QueryCommand";
import { stringToReadable } from "../../../../Utility/StreamUtil";
import { QueryEventsEmitter } from "../../QueryEvents";
import { InMemoryDocumentSessionOperations } from "../../InMemoryDocumentSessionOperations";

export class LazyQueryOperation<T extends object> implements ILazyOperation {
    private readonly _clazz: ObjectTypeDescriptor<T>;
    private readonly _session: InMemoryDocumentSessionOperations;
    private readonly _queryOperation: QueryOperation;
    private readonly _parent: QueryEventsEmitter;

    public constructor(
        session: InMemoryDocumentSessionOperations,
        queryOperation: QueryOperation,
        parent: QueryEventsEmitter,
        clazz: ObjectTypeDescriptor<T>) {

        this._clazz = clazz;
        this._session = session;
        this._queryOperation = queryOperation;
        this._parent = parent;
    }

    public createRequest(): GetRequest {
        const request = new GetRequest();
        request.canCacheAggressively = !this._queryOperation.indexQuery.disableCaching && !this._queryOperation.indexQuery.waitForNonStaleResults;
        request.url = "/queries";
        request.method = "POST";
        request.query = "?queryHash=" + this._queryOperation.indexQuery.getQueryHash(this._session.conventions.objectMapper);
        request.body = writeIndexQuery(this._session.conventions, this._queryOperation.indexQuery);
        return request;
    }

    private _result: object;
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

        let queryResult: QueryResult;
        if (response.result) {
            queryResult = await QueryCommand.parseQueryResultResponseAsync(
                stringToReadable(response.result), this._session.conventions, false);
        }
        this._handleResponse(queryResult, response.elapsed);
    }

    private _handleResponse(queryResult: QueryResult, duration: number): void {
        this._queryOperation.ensureIsAcceptableAndSaveResult(queryResult, duration);
        this._parent.emit("afterQueryExecuted", queryResult);
        this.result = this._queryOperation.complete(this._clazz);
        this.queryResult = queryResult;
    }
}
