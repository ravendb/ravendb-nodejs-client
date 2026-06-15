import { IOperation, OperationIdResult, OperationResultType } from "../OperationAbstractions.js";
import { IDocumentStore } from "../../IDocumentStore.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";
import { throwError } from "../../../Exceptions/index.js";

export class EnforceRevisionsConfigurationOperation implements IOperation<OperationIdResult> {
    private readonly _parameters: EnforceRevisionsParameters;

    constructor()
    constructor(parameters: EnforceRevisionsParameters)
    constructor(parameters?: EnforceRevisionsParameters) {
        this._parameters = parameters ?? {
            collections: null,
            includeForceCreated: false
        };
        if (this._parameters.maxOpsPerSecond != null && this._parameters.maxOpsPerSecond <= 0) {
            throwError("InvalidOperationException", "maxOpsPerSecond must be greater than 0");
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<OperationIdResult> {
        return new EnforceRevisionsConfigurationCommand(this._parameters, conventions);
    }
}

export interface EnforceRevisionsParameters {
    includeForceCreated: boolean;
    collections?: string[];
    /**
     * Limits the number of documents processed per second.
     * Use this to throttle the operation on large datasets.
     * Must be greater than 0. Default: no throttling.
     */
    maxOpsPerSecond?: number;
}

class EnforceRevisionsConfigurationCommand extends RavenCommand<OperationIdResult> {
    private readonly _parameters: EnforceRevisionsParameters;
    private readonly _conventions: DocumentConventions;


    constructor(parameters: EnforceRevisionsParameters, conventions: DocumentConventions) {
        super();
        this._parameters = parameters;
        this._conventions = conventions;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/revisions/config/enforce";

        const headers = this._headers()
            .typeAppJson()
            .build();

        const body = this._serializer.serialize(this._parameters);

        return {
            method: "POST",
            uri,
            headers,
            body
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}