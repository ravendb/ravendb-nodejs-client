import { ILazyOperation } from "./ILazyOperation";
import { ObjectTypeDescriptor } from "../../../../Types";
import { InMemoryDocumentSessionOperations } from "../../InMemoryDocumentSessionOperations";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { throwError } from "../../../../Exceptions";
import { QueryResult } from "../../../Queries/QueryResult";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { StatusCodes } from "../../../../Http/StatusCode";
import { ConditionalLoadResult } from "../../ConditionalLoadResult";
import { HEADERS } from "../../../../Constants";
import { QueryCommand } from "../../../Commands/QueryCommand";
import { stringToReadable } from "../../../../Utility/StreamUtil";
import { DocumentInfo } from "../../DocumentInfo";


export class LazyConditionalLoadOperation<T extends object> implements ILazyOperation {
    private readonly _clazz: ObjectTypeDescriptor<T>;
    private readonly _session: InMemoryDocumentSessionOperations;
    private readonly _id: string;
    private readonly _changeVector: string;

    public constructor(session: InMemoryDocumentSessionOperations, id: string, changeVector: string, clazz: ObjectTypeDescriptor<T>) {
        this._clazz = clazz;
        this._session = session;
        this._id = id;
        this._changeVector = changeVector;
    }

    public createRequest(): GetRequest {
        const request = new GetRequest();
        request.url = "/docs";
        request.method = "GET";
        request.query = "?id=" + encodeURIComponent(this._id);
        request.headers[HEADERS.IF_NONE_MATCH] = `"${this._changeVector}"`;
        return request;
    }

    private _result: any;
    private _requiresRetry: boolean;

    public get queryResult(): QueryResult {
        throwError("NotImplementedException");
        return null;
    }

    public get result(): any {
        return this._result;
    }

    public get requiresRetry() {
        return this._requiresRetry;
    }

    public async handleResponseAsync(response: GetResponse): Promise<void> {
        if (response.forceRetry) {
            this._result = null;
            this._requiresRetry = true;
            return;
        }

        switch (response.statusCode) {
            case StatusCodes.NotModified:
                this._result = {
                    entity: null,
                    changeVector: this._changeVector
                } as ConditionalLoadResult<any>;
                return;
            case StatusCodes.NotFound:
                this._session.registerMissing(this._id);
                this._result = {
                    entity: null,
                    changeVector: null
                } as ConditionalLoadResult<any>;
                return;
        }

        if (response.result) {
            const etag = response.headers[HEADERS.ETAG];

            const res = await QueryCommand.parseQueryResultResponseAsync(
                stringToReadable(response.result), this._session.conventions, false);
            const documentInfo = DocumentInfo.getNewDocumentInfo(res.results[0]);
            const r = this._session.trackEntity(this._clazz, documentInfo);

            this._result = {
                entity: r,
                changeVector: etag
            } as ConditionalLoadResult<any>;
            return;
        }

        this._result = null;
        this._session.registerMissing(this._id);
    }
}
