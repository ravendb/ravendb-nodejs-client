import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { Stream } from "node:stream";
import type { AiAgentActionResponse } from "./AiAgentActionResponse.js";
import type { AiConversationCreationOptions } from "./AiConversationCreationOptions.js";
import type { ConversationResult } from "./ConversationResult.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { IRaftCommand } from "../../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../../Utility/RaftIdGenerator.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { throwError } from "../../../../Exceptions/index.js";
import { JsonSerializer } from "../../../../Mapping/Json/Serializer.js";
import { ObjectUtil } from "../../../../Utility/ObjectUtil.js";
import { StringUtil } from "../../../../Utility/StringUtil.js";

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
        if (StringUtil.isNullOrEmpty(agentId)) {
            throwError("InvalidArgumentException", "agentId cannot be null or empty.");
        }
        if (StringUtil.isNullOrEmpty(conversationId)) {
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

        // Serialize properties to PascalCase, except "parameters" in CreationOptions, which must keep user-provided, case-sensitive keys unchanged.
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
            body: JsonSerializer.getDefault().serialize(serialized)
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream)
    }
}