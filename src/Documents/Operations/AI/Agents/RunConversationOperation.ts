import { IRavenObject } from "../../../../Types/IRavenObject.js";
import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { JsonSerializer } from "../../../../Mapping/Json/Serializer.js";
import { HeadersBuilder } from "../../../../Utility/HttpUtil.js";
import { StringUtil } from "../../../../Utility/StringUtil.js";
import { throwError } from "../../../../Exceptions/index.js";
import { ObjectUtil } from "../../../../Utility/ObjectUtil.js";
import { IRaftCommand } from "../../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";

export class AiAgentActionRequest implements IRavenObject {
    public name: string;
    public toolId: string;
    public arguments: string;
}

export class AiAgentActionResponse implements IRavenObject {
    public toolId: string;
    public content: string;
}

export class AiUsage implements IRavenObject {
    public promptTokens: number = 0;
    public completionTokens: number = 0;
    public totalTokens: number = 0;
    public cachedTokens: number = 0;
}

export class ConversationResult<TSchema> {
    public conversationId: string;
    public changeVector: string;
    public response: TSchema;
    public usage: AiUsage;
    public actionRequests: AiAgentActionRequest[];
}

interface ConversationRequestBody extends IRavenObject {
    parameters?: Record<string, any>;
    actionResponses?: AiAgentActionResponse[];
    userPrompt?: string;
}

export class RunConversationOperation<TSchema> implements IMaintenanceOperation<ConversationResult<TSchema>> {
    private readonly _agentId?: string;
    private readonly _userPrompt?: string;
    private readonly _parameters?: Record<string, any>;
    private readonly _conversationId?: string;
    private readonly _actionResponses?: AiAgentActionResponse[];
    private readonly _changeVector?: string;

    public constructor(agentId: string, userPrompt: string, parameters?: Record<string, any>);
    public constructor(conversationId: string, userPrompt?: string, actionResponses?: AiAgentActionResponse[], changeVector?: string);
    public constructor(
        agentIdOrConversationId: string,
        userPrompt?: string,
        parametersOrActionResponses?: Record<string, any> | AiAgentActionResponse[],
        changeVector?: string
    ) {
        if (changeVector !== undefined || Array.isArray(parametersOrActionResponses)) {
            // Constructor overload: conversationId-based
            if (StringUtil.isNullOrEmpty(agentIdOrConversationId)) {
                throwError("InvalidArgumentException", "conversationId cannot be null or empty");
            }

            this._conversationId = agentIdOrConversationId;
            this._userPrompt = userPrompt;
            this._actionResponses = parametersOrActionResponses as AiAgentActionResponse[];
            this._changeVector = changeVector;
        } else {
            // Constructor overload: agentId-based
            if (StringUtil.isNullOrEmpty(agentIdOrConversationId)) {
                throwError("InvalidArgumentException", "agentId cannot be null or empty");
            }
            if (StringUtil.isNullOrEmpty(userPrompt)) {
                throwError("InvalidArgumentException", "userPrompt cannot be null or empty");
            }

            this._agentId = agentIdOrConversationId;
            this._userPrompt = userPrompt;
            this._parameters = parametersOrActionResponses as Record<string, any>;
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ConversationResult<TSchema>> {
        return new RunConversationCommand<TSchema>(
            this._conversationId ?? null,
            this._agentId ?? null,
            this._userPrompt ?? null,
            this._parameters ?? null,
            this._actionResponses ?? null,
            this._changeVector ?? null,
            conventions
        );
    }
}

export class RunConversationCommand<TSchema> extends RavenCommand<ConversationResult<TSchema>> implements IRaftCommand {
    private readonly _conversationId?: string;
    private readonly _agentId?: string;
    private readonly _prompt?: string;
    private readonly _parameters?: Record<string, any>;
    private readonly _actionResponses?: AiAgentActionResponse[];
    private readonly _changeVector?: string;
    private readonly _conventions: DocumentConventions;

    public constructor(
        conversationId: string | null,
        agentId: string | null,
        prompt: string | null,
        parameters: Record<string, any> | null,
        actionResponses: AiAgentActionResponse[] | null,
        changeVector: string | null,
        conventions: DocumentConventions
    ) {
        super();
        this._conversationId = conversationId ?? undefined;
        this._agentId = agentId ?? undefined;
        this._prompt = prompt ?? undefined;
        this._parameters = parameters ?? undefined;
        this._actionResponses = actionResponses ?? undefined;
        this._changeVector = changeVector ?? undefined;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = `${node.url}/databases/${node.database}/ai/agent`;

        if (this._conversationId) {
            uri += `?conversationId=${encodeURIComponent(this._conversationId)}`;
        } else if (this._agentId) {
            uri += `?agentId=${encodeURIComponent(this._agentId)}`;
        }

        const requestBody: ConversationRequestBody = {};

        if (this._parameters) {
            requestBody.parameters = this._parameters;
        }

        if (this._actionResponses && this._actionResponses.length > 0) {
            requestBody.actionResponses = this._actionResponses;
        }

        if (this._prompt) {
            requestBody.userPrompt = this._prompt;
        }

        const bodyJson = ObjectUtil.transformObjectKeys(requestBody, {
            defaultTransform: ObjectUtil.pascal,
            ignorePaths: [/^Parameters\./],
        });

        const body = JsonSerializer.getDefault().serialize(bodyJson);

        const headers = HeadersBuilder
            .create()
            .typeAppJson();

        if (this._changeVector) {
            headers.with("If-Match", this._changeVector);
        }

        return {
            method: "POST",
            uri,
            body,
            headers: headers.build()
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

        this.result = this._convertResult(result, this._conventions);
        return body;
    }

    private _convertResult(response: any, conventions: DocumentConventions): ConversationResult<TSchema> {
        const result = new ConversationResult<TSchema>();

        if (response.conversationId) {
            result.conversationId = response.conversationId;
        }

        if (response.changeVector) {
            result.changeVector = response.changeVector;
        }

        if (response.response) {
            result.response = response.response;
        }

        if (response.usage) {
            result.usage = response.usage;
        }

        if (response.actionRequests && Array.isArray(response.actionRequests)) {
            result.actionRequests = response.actionRequests;
        }

        return result;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
