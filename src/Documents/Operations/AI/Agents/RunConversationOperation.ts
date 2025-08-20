import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { Stream } from "node:stream";
import type { AiAgentActionResponse } from "./AiAgentActionResponse.js";
import type { AiConversationCreationOptions } from "./AiConversationCreationOptions.js";
import type { ConversationResult } from "./ConversationResult.js";
import type { AiUsage } from "./AiUsage.js";
import type { AiAgentActionRequest } from "./AiAgentActionRequest.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { IRaftCommand } from "../../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { throwError } from "../../../../Exceptions/index.js";
import { JsonSerializer } from "../../../../Mapping/Json/Serializer.js";
import { ObjectUtil } from "../../../../Utility/ObjectUtil.js";

export class RunConversationOperation<TAnswer> implements IMaintenanceOperation<ConversationResult<TAnswer>> {
    private readonly _agentId: string;
    private readonly _conversationId: string;
    private readonly _userPrompt?: string;
    private readonly _actionResponses?: AiAgentActionResponse[];
    private readonly _options?: AiConversationCreationOptions;
    private readonly _changeVector?: string;

    public constructor(
        agentId: string,
        conversationId: string,
        userPrompt?: string,
        actionResponses?: AiAgentActionResponse[],
        options?: AiConversationCreationOptions,
        changeVector?: string
    ) {
        if (!agentId) {
            throwError("InvalidArgumentException", "agentId cannot be null or empty.");
        }
        if (!conversationId) {
            throwError("InvalidArgumentException", "conversationId cannot be null or empty.");
        }
        this._agentId = agentId;
        this._conversationId = conversationId;
        this._userPrompt = userPrompt;
        this._actionResponses = actionResponses;
        this._options = options;
        this._changeVector = changeVector;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ConversationResult<TAnswer>> {
        return new RunConversationCommand<TAnswer>(
            this._conversationId,
            this._agentId,
            this._userPrompt,
            this._actionResponses,
            this._options,
            this._changeVector,
            conventions
        );
    }
}

class RunConversationCommand<TAnswer>
    extends RavenCommand<ConversationResult<TAnswer>> implements IRaftCommand {

    private readonly _conversationId: string;
    private readonly _agentId: string;
    private readonly _prompt?: string;
    private readonly _actionResponses?: AiAgentActionResponse[];
    private readonly _options?: AiConversationCreationOptions;
    private readonly _changeVector?: string;
    private _raftId: string;

    public constructor(
        conversationId: string,
        agentId: string,
        prompt: string | undefined,
        actionResponses: AiAgentActionResponse[] | undefined,
        options: AiConversationCreationOptions | undefined,
        changeVector: string | undefined,
        conventions: DocumentConventions
    ) {
        super();
        this._conversationId = conversationId;
        this._agentId = agentId;
        this._prompt = prompt;
        this._actionResponses = actionResponses;
        this._options = options;
        this._changeVector = changeVector;

        // For new conversation IDs (ending with '|'), we need a raft id
        if (this._conversationId && this._conversationId.endsWith("|")) {
            this._raftId = RaftIdGenerator.newId();
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    public getRaftUniqueRequestId(): string {
        return this._raftId;
    }

createRequest(node: ServerNode): HttpRequestParameters {
    const uriParams = new URLSearchParams({
        conversationId: this._conversationId,
        agentId: this._agentId,
    });

    if (this._changeVector) {
        uriParams.append("changeVector", this._changeVector);
    }

    const uri = `${node.url}/databases/${node.database}/ai/agent?${uriParams}`;

    const bodyObj = {
        ActionResponses: this._actionResponses,
        UserPrompt: this._prompt,
        CreationOptions: this._options
    };

    const headers = this._headers().typeAppJson().build();

    // Serialize to PascalCase but ignore the parameters property in CreationOptions
    const serialized = ObjectUtil.transformObjectKeys(bodyObj, {
        defaultTransform: ObjectUtil.pascalCase,
        ignorePaths: [
            new RegExp("^CreationOptions\\.Parameters\\..*$")
        ]
    });


    return {
        method: "POST",
        uri,
        headers,
        body: JSON.stringify(serialized)
    };
}

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body = "";
        const raw = await this._defaultPipeline<any>(_ => body = _).process(bodyStream);

        // Normalize server PascalCase payload to our camelCase TS interface
        const result: ConversationResult<TAnswer> = {
            conversationId: raw?.ConversationId ?? raw?.conversationId,
            changeVector: raw?.ChangeVector ?? raw?.changeVector,
            response: (raw?.Response ?? raw?.response) as TAnswer,
            totalUsage: normalizeUsage(raw?.TotalUsage ?? raw?.totalUsage),
            actionRequests: normalizeActionRequests(raw?.ActionRequests ?? raw?.actionRequests)
        };

        this.result = result;
        return body;
    }
}

function normalizeUsage(u: any): AiUsage {
    if (!u) return null;
    return {
        promptTokens: u.PromptTokens ?? u.promptTokens,
        completionTokens: u.CompletionTokens ?? u.completionTokens,
        totalTokens: u.TotalTokens ?? u.totalTokens,
        cachedTokens: u.CachedTokens ?? u.cachedTokens
    } as AiUsage;
}

function normalizeActionRequests(list: any[]): AiAgentActionRequest[] {
    if (!Array.isArray(list)) return [];
    return list.map(x => ({
        name: x.Name ?? x.name,
        toolId: x.ToolId ?? x.toolId,
        arguments: x.Arguments ?? x.arguments
    } as AiAgentActionRequest));
}
