import { Stream } from "node:stream";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { throwError } from "../../../Exceptions/index.js";
import { DateUtil } from "../../../Utility/DateUtil.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";

export interface DeleteRevisionsOperationResult {
    totalDeletes: number;
}

interface DeleteRevisionsParameters {
    documentIds: string[];
    removeForceCreatedRevisions: boolean;
    revisionsChangeVectors?: string[];
    from?: Date;
    to?: Date;
}

export class DeleteRevisionsOperation implements IMaintenanceOperation<DeleteRevisionsOperationResult> {
    private readonly _parameters: DeleteRevisionsParameters;

    public constructor(documentIdOrIds: string | string[], removeForceCreatedRevisions?: boolean);
    public constructor(
        documentIdOrIds: string | string[], from: Date | null, to: Date | null, removeForceCreatedRevisions?: boolean);
    public constructor(documentId: string, revisionsChangeVectors: string[], removeForceCreatedRevisions?: boolean);
    public constructor(
        documentIdOrIds: string | string[],
        fromOrChangeVectorsOrRemoveForceCreated?: Date | string[] | boolean | null,
        toOrRemoveForceCreated?: Date | boolean | null,
        removeForceCreatedRevisions?: boolean) {
        const documentIds = TypeUtil.isArray(documentIdOrIds) ? documentIdOrIds : [documentIdOrIds];

        if (TypeUtil.isArray(fromOrChangeVectorsOrRemoveForceCreated)) {
            this._parameters = {
                documentIds,
                revisionsChangeVectors: fromOrChangeVectorsOrRemoveForceCreated,
                removeForceCreatedRevisions: !!toOrRemoveForceCreated
            };
        } else if (TypeUtil.isBool(fromOrChangeVectorsOrRemoveForceCreated)
            || (fromOrChangeVectorsOrRemoveForceCreated === undefined && toOrRemoveForceCreated === undefined)) {
            this._parameters = {
                documentIds,
                removeForceCreatedRevisions: !!fromOrChangeVectorsOrRemoveForceCreated
            };
        } else {
            this._parameters = {
                documentIds,
                from: fromOrChangeVectorsOrRemoveForceCreated ?? undefined,
                to: (toOrRemoveForceCreated as Date) ?? undefined,
                removeForceCreatedRevisions: !!removeForceCreatedRevisions
            };
        }

        DeleteRevisionsOperation._validate(this._parameters);
    }

    private static _validate(parameters: DeleteRevisionsParameters): void {
        const { documentIds, revisionsChangeVectors, from, to } = parameters;

        if (!documentIds.length) {
            throwError("InvalidArgumentException", "request 'DocumentIds' cannot be null or empty.");
        }

        if (documentIds.some(id => !id)) {
            throwError("InvalidArgumentException", "request 'DocumentIds' contains null or empty ids.");
        }

        if (!revisionsChangeVectors?.length) {
            if (from && to && from >= to) {
                throwError("InvalidArgumentException", "'To' must be greater than 'From'.");
            }
            return;
        }

        if (documentIds.length > 1) {
            throwError(
                "InvalidArgumentException",
                "The request must include exactly one document ID when deleting specific revisions by their change-vectors.");
        }

        if (revisionsChangeVectors.some(changeVector => !changeVector)) {
            throwError(
                "InvalidArgumentException", "request 'RevisionsChangeVectors' contains null or empty change-vectors.");
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<DeleteRevisionsOperationResult> {
        return new DeleteRevisionsCommand(this._parameters);
    }
}

class DeleteRevisionsCommand extends RavenCommand<DeleteRevisionsOperationResult> {
    private readonly _parameters: DeleteRevisionsParameters;

    public constructor(parameters: DeleteRevisionsParameters) {
        super();
        this._parameters = parameters;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/revisions";

        const { from, to, ...rest } = this._parameters;
        const body = this._serializer.serialize({
            ...rest,
            from: from ? DateUtil.utc.stringify(from) : undefined,
            to: to ? DateUtil.utc.stringify(to) : undefined
        });

        return {
            method: "DELETE",
            uri,
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
}
