import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { StringUtil } from "../../../../Utility/StringUtil.js";
import { throwError } from "../../../../Exceptions/index.js";
import { IRaftCommand } from "../../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";
import { AiAgentConfigurationResult } from "./AiAgentConfigurationResult.js";

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
        return new DeleteAiAgentCommand(this._identifier);
    }
}

export class DeleteAiAgentCommand extends RavenCommand<AiAgentConfigurationResult> implements IRaftCommand {
    private readonly _identifier: string;

    public constructor(identifier: string) {
        super();
        this._identifier = identifier;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/databases/${node.database}/admin/ai/agent?id=${encodeURIComponent(this._identifier)}`;

        return {
            method: "DELETE",
            uri
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return "";
        }

        let body: string = "";
        const result = await this._defaultPipeline()
            .collectBody(b => body = b)
            .process(bodyStream);

        this.result = result as AiAgentConfigurationResult;
        return body;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
