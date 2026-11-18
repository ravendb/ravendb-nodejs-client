import { AbstractAwaitableOperation, IOperation, OperationIdResult } from "../OperationAbstractions.js";
import { IDocumentStore } from "../../IDocumentStore.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { throwError } from "../../../Exceptions/index.js";
import { RevisionsOperationParameters } from "./RevisionsOperationParameters.js";
import { OperationResult } from "./RevertResult.js";

export type AdoptOrphanedRevisionsParameters = RevisionsOperationParameters;

export interface AdoptOrphanedRevisionsResult extends OperationResult {
    adoptedCount: number;
}

/**
 * Adds the missing "Delete Revision" to revisions of deleted documents, so they show up in the revisions bin.
 */
export class AdoptOrphanedRevisionsOperation extends AbstractAwaitableOperation implements IOperation<OperationIdResult> {
    private readonly _parameters: AdoptOrphanedRevisionsParameters;

    public constructor(parameters: AdoptOrphanedRevisionsParameters = {}) {
        super();
        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }
        this._parameters = parameters;
    }

    public getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<OperationIdResult> {
        return new AdoptOrphanedRevisionsCommand(this._parameters);
    }
}

class AdoptOrphanedRevisionsCommand extends RavenCommand<OperationIdResult> {
    private readonly _parameters: AdoptOrphanedRevisionsParameters;

    public constructor(parameters: AdoptOrphanedRevisionsParameters) {
        super();
        this._parameters = parameters;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/revisions/orphaned/adopt";

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body: this._serializer.serialize(this._parameters)
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
