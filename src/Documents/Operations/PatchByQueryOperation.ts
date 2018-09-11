import { HttpRequestParameters } from "../../Primitives/Http";
import { IOperation, OperationIdResult, OperationResultType } from "./OperationAbstractions";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery";
import { QueryOperationOptions } from "../Queries/QueryOperationOptions";
import { TypeUtil } from "../../Utility/TypeUtil";
import { throwError } from "../../Exceptions";
import { IDocumentStore } from "../IDocumentStore";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { HttpCache } from "../../Http/HttpCache";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";

export class PatchByQueryOperation implements IOperation<OperationIdResult> {

    protected static DUMMY_QUERY = new IndexQuery();

    private _queryToUpdate: IndexQuery;
    private _options: QueryOperationOptions;

    public constructor(queryToUpdate: IndexQuery);
    public constructor(queryToUpdate: string);
    public constructor(queryToUpdate: IndexQuery, options?: QueryOperationOptions);
    public constructor(queryToUpdate: IndexQuery | string, options?: QueryOperationOptions) {
        if (TypeUtil.isString(queryToUpdate)) {
            queryToUpdate = new IndexQuery(queryToUpdate as string);
        }

        if (!queryToUpdate) {
            throwError("InvalidArgumentException", "QueryToUpdate cannot be null");
        }

        this._queryToUpdate = queryToUpdate as IndexQuery;
        this._options = options;
    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache): RavenCommand<OperationIdResult> {
        return new PatchByQueryCommand(conventions, this._queryToUpdate, this._options);
    }

    public get resultType(): OperationResultType {
        return "OperationId";
    }

}

export class PatchByQueryCommand extends RavenCommand<OperationIdResult> {
    private _conventions: DocumentConventions;
    private _queryToUpdate: IndexQuery;
    private _options: QueryOperationOptions;

    public get isReadRequest(): boolean {
        return false;
    }

    public constructor(
        conventions: DocumentConventions, queryToUpdate: IndexQuery, options: QueryOperationOptions) {
        super();
        this._conventions = conventions;
        this._queryToUpdate = queryToUpdate;
        this._options = options || {} as QueryOperationOptions;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let path = node.url + "/databases/" + node.database + "/queries?allowStale="
            + !!this._options.allowStale;
        if (!TypeUtil.isNullOrUndefined(this._options.maxOpsPerSecond)) {
            path += "&maxOpsPerSec=" + this._options.maxOpsPerSecond;
        }

        path += "&details=" + !!this._options.retrieveDetails;

        if (!TypeUtil.isNullOrUndefined(this._options.staleTimeout)) {
            path += "&staleTimeout=" + this._options.staleTimeout;
        }

        const body = `{ "Query": ${writeIndexQuery(this._conventions, this._queryToUpdate)} }`;

        return {
            method: "PATCH",
            uri: path,
            headers: this._getHeaders().withContentTypeJson().build(),
            body
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

}
