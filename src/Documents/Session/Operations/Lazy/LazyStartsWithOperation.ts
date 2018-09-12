import { ILazyOperation } from "./ILazyOperation";
import { ObjectTypeDescriptor } from "../../../../Types";
import { InMemoryDocumentSessionOperations } from "../../InMemoryDocumentSessionOperations";
import { SessionLoadStartingWithOptions } from "../../IDocumentSession";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { QueryResult } from "../../../Queries/QueryResult";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { GetDocumentsCommand } from "../../../Commands/GetDocumentsCommand";
import { stringToReadable } from "../../../../Utility/StreamUtil";
import { DocumentInfo } from "../../DocumentInfo";

const enc = encodeURIComponent;
export class LazyStartsWithOperation<T extends object> implements ILazyOperation {

    private readonly _clazz: ObjectTypeDescriptor<T>;
    private readonly _idPrefix: string;
    private readonly _matches: string;
    private readonly _exclude: string;
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _sessionOperations: InMemoryDocumentSessionOperations;
    private readonly _startAfter: string;

    public constructor(
        idPrefix: string, 
        opts: SessionLoadStartingWithOptions<T>,
        sessionOperations: InMemoryDocumentSessionOperations) {
        
        this._idPrefix = idPrefix;
        this._matches = opts.matches;
        this._exclude = opts.exclude;
        this._start = opts.start;
        this._pageSize = opts.pageSize;
        this._sessionOperations = sessionOperations;
        this._startAfter = opts.startAfter;
        this._clazz = sessionOperations.conventions.findEntityType(opts.documentType);
    }

    public createRequest(): GetRequest {
        const request = new GetRequest();
        request.url = "/docs";
        request.query = 
            // tslint:disable-next-line:max-line-length
            `?startsWith=${enc(this._idPrefix)}&matches=${enc(this._matches) || ""}&exclude=${enc(this._exclude) || ""}&start=${this._start}&pageSize=${this._pageSize}&startAfter=${enc(this._startAfter)}`;
        return request;
    }

    private _result: Object;
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

        const { results } = await GetDocumentsCommand.parseDocumentsResultResponseAsync(
            stringToReadable(response.result), this._sessionOperations.conventions);

        const finalResults = {};
        for (const document of results) {
            const newDocumentInfo = DocumentInfo.getNewDocumentInfo(document);
            this._sessionOperations.documentsById.add(newDocumentInfo);
            if (!newDocumentInfo.id) {
                continue;
            }

            if (this._sessionOperations.isDeleted(newDocumentInfo.id)) {
                finalResults[newDocumentInfo.id] = null;
                continue;
            }

            const doc = this._sessionOperations.documentsById.getValue(newDocumentInfo.id);
            if (doc) {
                finalResults[newDocumentInfo.id] = this._sessionOperations.trackEntity(this._clazz, doc);
                continue;
            }

            finalResults[newDocumentInfo.id] = null;
        }

        this.result = finalResults;
    }
}
