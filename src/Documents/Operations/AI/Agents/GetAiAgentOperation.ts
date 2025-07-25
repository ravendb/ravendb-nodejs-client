import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { StringUtil } from "../../../../Utility/StringUtil.js";
import { throwError } from "../../../../Exceptions/index.js";
import { AiAgentConfiguration } from "./AiAgentConfiguration.js";

export class GetAiAgentsResponse {
    public aiAgents: AiAgentConfiguration[];
}

export class GetAiAgentOperation implements IMaintenanceOperation<GetAiAgentsResponse> {
    private readonly _agentId?: string;

    public constructor(agentId?: string) {
        if (agentId && StringUtil.isNullOrEmpty(agentId)) {
            throwError("InvalidArgumentException", "agentId cannot be empty");
        }
        this._agentId = agentId;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<GetAiAgentsResponse> {
        return new GetAiAgentCommand(this._agentId);
    }
}

export class GetAiAgentCommand extends RavenCommand<GetAiAgentsResponse> {
    private readonly _agentId?: string;

    public constructor(agentId?: string) {
        super();
        this._agentId = agentId;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = `${node.url}/databases/${node.database}/admin/ai/agent`;

        if (this._agentId) {
            uri += `?agentId=${encodeURIComponent(this._agentId)}`;
        }

        return {
            method: "GET",
            uri
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this.result = new GetAiAgentsResponse();
            return "";
        }

        let body: string = "";
        const result = await this._defaultPipeline()
            .collectBody(b => body = b)
            .process(bodyStream);

        this.result = result as GetAiAgentsResponse;
        return body;
    }
}
