import * as StringBuilder from "string-builder";
import { ILazyOperation } from "./ILazyOperation";
import { ObjectTypeDescriptor } from "../../../../Types";
import { InMemoryDocumentSessionOperations } from "../../InMemoryDocumentSessionOperations";
import { LoadOperation } from "../LoadOperation";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { QueryResult } from "../../../Queries/QueryResult";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { GetDocumentsResult, GetDocumentsCommand } from "../../../Commands/GetDocumentsCommand";
import { stringToReadable } from "../../../../Utility/StreamUtil";

export class LazyLoadOperation<T extends object> implements ILazyOperation {
    private readonly _clazz: ObjectTypeDescriptor<T>;
    private readonly _session: InMemoryDocumentSessionOperations;
    private readonly _loadOperation: LoadOperation;
    private _ids: string[];
    private _includes: string[];
    private _result: any;
    private _queryResult: QueryResult;
    private _requiresRetry: boolean;

    public constructor(
        session: InMemoryDocumentSessionOperations, loadOperation: LoadOperation,  clazz: ObjectTypeDescriptor<T>) {
        this._clazz = clazz;
        this._session = session;
        this._loadOperation = loadOperation;
    }

    public createRequest(): GetRequest {
        const idsToCheckOnServer = this._ids
            .filter(id => !this._session.isLoadedOrDeleted(id));
        const queryBuilder = new StringBuilder("?");
         
        if (this._includes) {
            for (const include of this._includes) {
                queryBuilder.append("&include=").append(include);
            }
        }

        for (const id of idsToCheckOnServer) {
            queryBuilder.append("&id=").append(encodeURIComponent(id));
        } 
        
        const hasItems = idsToCheckOnServer.length;
        if (!hasItems) {
            // no need to hit the server
            this._result = this._loadOperation.getDocuments(this._clazz);
            return null;
        }

        const getRequest = new GetRequest();
        getRequest.url = "/docs";
        getRequest.query = queryBuilder.toString();
        return getRequest;
    }

     public byId(id: string): LazyLoadOperation<T> {
        if (!id) {
            return this;
        }

        if (!this._ids) {
            this._ids = [ id ];
        }
        
        return this;
    }

     public byIds(ids: string[]): LazyLoadOperation<T> {
        this._ids = ids;
        return this;
    }

     public withIncludes(includes: string[]): LazyLoadOperation<T> {
        this._includes = includes;
        return this;
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

    public async handleResponseAsync(response: GetResponse): Promise<void> {
        if (response.forceRetry) {
            this.result = null;
            this.requiresRetry = true;
            return;
        }

        const multiLoadResult: GetDocumentsResult = 
            await GetDocumentsCommand.parseDocumentsResultResponseAsync(
                stringToReadable(response.result), this._session.conventions);

        this._handleResponse(multiLoadResult);
    }

    private _handleResponse(loadResult: GetDocumentsResult): void {
        this._loadOperation.setResult(loadResult);

        if (!this._requiresRetry) {
            this._result = this._loadOperation.getDocuments(this._clazz);
        }
    }

    public getResult() {
        return null;
    }
}
