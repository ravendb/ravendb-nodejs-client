import { ILazyOperation } from "./ILazyOperation";
import { IRavenArrayResult, ObjectTypeDescriptor } from "../../../../Types";
import { GetRevisionOperation } from "../GetRevisionOperation";
import { QueryResult } from "../../../Queries/QueryResult";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { DocumentType } from "../../../DocumentAbstractions";
import { throwError } from "../../../../Exceptions";
import { StringBuilder } from "../../../../Utility/StringBuilder";
import { GetDocumentsCommand } from "../../../Commands/GetDocumentsCommand";
import { readToEnd, stringToReadable } from "../../../../Utility/StreamUtil";

export type Mode = "Single" | "Multi" | "Map" | "ListOfMetadata";

export class LazyRevisionOperation<T extends object> implements ILazyOperation {
    private readonly _clazz: DocumentType<T>;
    private readonly _getRevisionOperation: GetRevisionOperation;
    private _mode: Mode;

    private _result: object;
    private _queryResult: QueryResult;
    private _requiresRetry: boolean;


    public constructor(clazz: DocumentType<T>, getRevisionOperation: GetRevisionOperation, mode: Mode) {
        this._clazz = clazz;
        this._getRevisionOperation = getRevisionOperation;
        this._mode = mode;
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


    createRequest(): GetRequest {
        const getRevisionsCommand = this._getRevisionOperation.command;
        const getRequest = new GetRequest();
        getRequest.method = "GET";
        getRequest.url = "/revisions";
        getRequest.query = "?" + getRevisionsCommand.getRequestQueryString();

        return getRequest;
    }

    async handleResponseAsync(response: GetResponse): Promise<void> {
        if (!response.result) {
            return;
        }

        const responseAsNode = JSON.parse(response.result);

        const jsonArrayResult: IRavenArrayResult = {
            results: responseAsNode.Results
        };

        this._getRevisionOperation.result = jsonArrayResult;

        switch (this._mode) {
            case "Single":
                this._result = this._getRevisionOperation.getRevision(this._clazz);
                break;
            case "Multi":
                this._result = this._getRevisionOperation.getRevisionsFor(this._clazz);
                break;
            case "Map":
                this._result = this._getRevisionOperation.getRevisions(this._clazz);
                break;
            case "ListOfMetadata":
                this._result = this._getRevisionOperation.getRevisionsMetadataFor();
                break;
            default:
                throwError("InvalidArgumentException", "Invalid mode: " + this._mode);
        }
    }
}