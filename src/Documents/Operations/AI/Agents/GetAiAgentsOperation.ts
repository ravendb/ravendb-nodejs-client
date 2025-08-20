import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { Stream } from "node:stream";
import type { GetAiAgentsResponse } from "./GetAiAgentsResponse.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";

export class GetAiAgentsOperation implements IMaintenanceOperation<GetAiAgentsResponse> {
    private readonly _agentId?: string;

    public constructor(agentId?: string) {
        this._agentId = agentId;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<GetAiAgentsResponse> {
        return new GetAiAgentsCommand(this._agentId, conventions);
    }
}

class GetAiAgentsCommand extends RavenCommand<GetAiAgentsResponse> {
    private readonly _agentId?: string;
    private readonly _conventions: DocumentConventions;

    public constructor(agentId: string | undefined, conventions: DocumentConventions) {
        super();
        this._agentId = agentId;
        this._conventions = conventions;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = `${node.url}/databases/${node.database}/admin/ai/agent`;
        if (this._agentId) {
            uri += `?agentId=${encodeURIComponent(this._agentId)}`;
        }
        return {
            method: "GET",
            uri
        };
    }

    get isReadRequest(): boolean {
        return true;
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = "";
        const result = await this._defaultPipeline()
            .collectBody(b => body = b)
            .process(bodyStream);

        this.result = result as GetAiAgentsResponse;
        return body;
    }
}
