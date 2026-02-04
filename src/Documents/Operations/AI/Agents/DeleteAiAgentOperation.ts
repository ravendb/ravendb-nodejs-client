import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { Stream } from "node:stream";
import type { AiAgentConfigurationResult } from "./AiAgentConfigurationResult.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { StringUtil } from "../../../../Utility/StringUtil.js";
import { throwError } from "../../../../Exceptions/index.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";

export class DeleteAiAgentOperation implements IMaintenanceOperation<AiAgentConfigurationResult> {
    private readonly _identifier: string;

    public constructor(identifier: string) {
        if (StringUtil.isNullOrEmpty(identifier)) {
            throwError("InvalidArgumentException", "identifier cannot be null or empty");
        }
        this._identifier = identifier;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<AiAgentConfigurationResult> {
        return new DeleteAiAgentCommand(this._identifier, conventions);
    }
}

class DeleteAiAgentCommand extends RavenCommand<AiAgentConfigurationResult> {
    private readonly _identifier: string;
    private readonly _conventions: DocumentConventions;

    public constructor(identifier: string, conventions: DocumentConventions) {
        super();
        this._identifier = identifier;
        this._conventions = conventions;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/admin/ai/agent?agentId=${encodeURIComponent(this._identifier)}`;

        return {
            method: "DELETE",
            uri
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream)
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
