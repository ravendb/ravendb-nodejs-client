import { HttpRequestParameters } from "../../Primitives/Http.js";
import { IOperation, OperationIdResult, OperationResultType } from "./OperationAbstractions.js";
import { IndexQuery, writeIndexQuery } from "../Queries/IndexQuery.js";
import { QueryOperationOptions } from "../Queries/QueryOperationOptions.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { throwError } from "../../Exceptions/index.js";
import { IDocumentStore } from "../IDocumentStore.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { HttpCache } from "../../Http/HttpCache.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { TimeUtil } from "../../Utility/TimeUtil.js";

export class PatchByQueryOperation implements IOperation<OperationIdResult> {

    protected static DUMMY_QUERY = new IndexQuery();

    private readonly _queryToUpdate: IndexQuery;
    private readonly _options: QueryOperationOptions;

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
    private readonly _conventions: DocumentConventions;
    private readonly _queryToUpdate: IndexQuery;
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

        if (this._options.ignoreMaxStepsForScript) {
            path += "&ignoreMaxStepsForScript=true";
        }

        path += PatchByQueryCommand.indexPatchOptionsToQueryString(this._options);

        const body = `{ "Query": ${writeIndexQuery(this._conventions, this._queryToUpdate)} }`;

        return {
            method: "PATCH",
            uri: path,
            headers: this._headers().typeAppJson().build(),
            body
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public static indexPatchOptionsToQueryString(options: QueryOperationOptions): string {
        const indexPatchOptions = options.indexPatchOptions;
        if (!indexPatchOptions) {
            return "";
        }

        let result = "&waitForIndexesTimeout=" + TimeUtil.millisToTimeSpan(indexPatchOptions.waitForIndexesTimeout ?? 15_000)
            + "&throwOnTimeoutInWaitForIndexes=" + !!indexPatchOptions.throwOnTimeoutInWaitForIndexes;

        for (const specificIndex of indexPatchOptions.waitForSpecificIndexes ?? []) {
            result += "&waitForSpecificIndexes=" + encodeURIComponent(specificIndex);
        }

        return result;
    }
}
