import { HttpRequestParameters } from "../../Primitives/Http.js";
import { IOperation, OperationIdResult, OperationResultType } from "./OperationAbstractions.js";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery.js";
import { throwError } from "../../Exceptions/index.js";
import { HttpCache } from "../../Http/HttpCache.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { IDocumentStore } from "../IDocumentStore.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { QueryOperationOptions } from "../Queries/QueryOperationOptions.js";
import { Stream } from "node:stream";
import { StringBuilder } from "../../Utility/StringBuilder.js";
import { PatchByQueryCommand } from "./PatchByQueryOperation.js";

export class DeleteByQueryOperation implements IOperation<OperationIdResult> {

    public get resultType(): OperationResultType {
        return "OperationId";
    }

    protected _queryToDelete: IndexQuery;

    private readonly _options: QueryOperationOptions;

    public constructor(queryToDelete: string);
    public constructor(queryToDelete: IndexQuery);
    public constructor(queryToDelete: IndexQuery, options: QueryOperationOptions);
    public constructor(queryToDelete: IndexQuery | string, options?: QueryOperationOptions) {
        if (!queryToDelete) {
            throwError("InvalidArgumentException", "QueryToDelete cannot be null");
        }

        this._queryToDelete = TypeUtil.isString(queryToDelete) ? new IndexQuery(queryToDelete) : queryToDelete;
        this._options = options;
    }

    public getCommand(
        store: IDocumentStore,
        conventions: DocumentConventions,
        cache: HttpCache): RavenCommand<OperationIdResult> {
        return new DeleteByIndexCommand(conventions, this._queryToDelete, this._options);
    }

}

export class DeleteByIndexCommand extends RavenCommand<OperationIdResult> {

    private readonly _conventions: DocumentConventions;
    private readonly _queryToDelete: IndexQuery;
    private _options: QueryOperationOptions;

    public constructor(
        conventions: DocumentConventions, queryToDelete: IndexQuery, options: QueryOperationOptions) {
        super();
        this._conventions = conventions;
        this._queryToDelete = queryToDelete;
        this._options = options || {} as QueryOperationOptions;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const path = new StringBuilder(node.url)
            .append("/databases/")
            .append(node.database)
            .append("/queries")
            .append("?allowStale=")
            .append(this._options.allowStale || "");

        if (!TypeUtil.isNullOrUndefined(this._options.maxOpsPerSecond)) {
            path.append("&maxOpsPerSec=")
                .append(this._options.maxOpsPerSecond);
        }

        path
            .append("&details=")
            .append(this._options.retrieveDetails || "");

        if (this._options.staleTimeout) {
            path.append("&staleTimeout=")
                .append(this._options.staleTimeout);
        }

        path.append(PatchByQueryCommand.indexPatchOptionsToQueryString(this._options));

        const body = writeIndexQuery(this._conventions, this._queryToDelete);

        const headers = this._headers().typeAppJson().build();
        const uri = path.toString();
        return {
            uri,
            body,
            method: "DELETE",
            headers
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
