import { IAiConversationOperations } from "./IAiConversationOperations.js";
import { AiConversationResult } from "./AiConversationResult.js";
import { AiAgentActionRequest, AiAgentActionResponse, RunConversationOperation } from "../Operations/AI/Agents/RunConversationOperation.js";
import { StringUtil } from "../../Utility/StringUtil.js";
import { throwError } from "../../Exceptions/index.js";
import { MaintenanceOperationExecutor } from "../Operations/MaintenanceOperationExecutor.js";

interface NewConversationOptions {
    type: "new";
    agentId: string;
    parameters?: Record<string, any>;
}

interface ExistingConversationOptions {
    type: "existing";
    conversationId: string;
    changeVector: string;
}

type ConversationOptions = NewConversationOptions | ExistingConversationOptions;

export class AiConversation<T> implements IAiConversationOperations<T> {
    private readonly _maintenanceExecutor: MaintenanceOperationExecutor;
    private readonly _agentId?: string;
    private readonly _parameters?: Record<string, any>;

    private _conversationId?: string;
    private _actionRequests?: AiAgentActionRequest[];
    private _actionResponses: AiAgentActionResponse[] = [];
    private _userPrompt?: string;
    private _changeVector?: string;
    private _answer?: T;

    private constructor(maintenanceExecutor: MaintenanceOperationExecutor, options: ConversationOptions) {
        this._maintenanceExecutor = maintenanceExecutor;

        if (options.type === "new") {
            if (StringUtil.isNullOrEmpty(options.agentId)) {
                throwError("InvalidArgumentException", "agentId cannot be null or empty");
            }
            this._agentId = options.agentId;
            this._parameters = options.parameters;
        } else {
            if (StringUtil.isNullOrEmpty(options.conversationId)) {
                throwError("InvalidArgumentException", "conversationId cannot be null or empty");
            }
            this._conversationId = options.conversationId;
            this._changeVector = options.changeVector;
        }
    }

    public static start<T>(maintenanceExecutor: MaintenanceOperationExecutor, agentId: string, parameters?: Record<string, any>): AiConversation<T> {
        return new AiConversation<T>(maintenanceExecutor, {
            type: "new",
            agentId,
            parameters
        });
    }

    public static resume<T>(maintenanceExecutor: MaintenanceOperationExecutor, conversationId: string, changeVector: string): AiConversation<T> {
        return new AiConversation<T>(maintenanceExecutor, {
            type: "existing",
            conversationId,
            changeVector
        });
    }

    public get id(): string {
        if (!this._conversationId) {
            throwError("InvalidOperationException", "This is a new conversation, the ID wasn't set yet, you have to call run/runAsync");
        }
        return this._conversationId;
    }

    public get answer(): T {
        if (!this._answer) {
            throwError("InvalidOperationException", "You have to call run/runAsync first");
        }
        return this._answer;
    }

    public get changeVector(): string {
        return this._changeVector ?? "";
    }

    public requiredActions(): AiAgentActionRequest[] {
        if (!this._actionRequests) {
            throwError("InvalidOperationException", "You have to call run/runAsync first");
        }
        return this._actionRequests;
    }

    public addActionResponse(actionId: string, actionResponse: string): void;
    public addActionResponse<TResponse extends object>(actionId: string, actionResponse: TResponse): void;
    public addActionResponse<TResponse extends object>(actionId: string, actionResponse: string | TResponse): void {
        let content: string;
        
        if (typeof actionResponse === "string") {
            content = actionResponse;
        } else {
            // For object responses, we need to serialize them
            content = JSON.stringify(actionResponse);
        }

        this._actionResponses.push({
            toolId: actionId,
            content: content
        });
    }

    public setUserPrompt(userPrompt: string): void {
        if (StringUtil.isNullOrEmpty(userPrompt)) {
            throwError("InvalidArgumentException", "userPrompt cannot be null or empty");
        }
        this._userPrompt = userPrompt;
    }

    public async run(token?: AbortSignal): Promise<AiConversationResult> {
        let operation: RunConversationOperation<T>;

        if (!this._conversationId) {
            operation = new RunConversationOperation<T>(this._agentId!, this._userPrompt!, this._parameters);
        } else {
            // we allow to run the conversation only if it is the first run with no user prompt or tool requests
            // this way we can fetch the pending actions
            if (this._actionRequests && !this._userPrompt && this._actionResponses.length === 0) {
                return AiConversationResult.Done;
            }

            operation = new RunConversationOperation<T>(
                this._conversationId,
                this._userPrompt,
                this._actionResponses,
                this._changeVector
            );
        }

        try {
            const result = await this._maintenanceExecutor.send(operation);
            
            this._conversationId = result.conversationId;
            this._changeVector = result.changeVector;
            this._answer = result.response;
            this._actionRequests = result.actionRequests || [];
            
            // Reset for next turn
            this._actionResponses = [];
            this._userPrompt = undefined;

            return (this._actionRequests && this._actionRequests.length > 0) 
                ? AiConversationResult.ActionRequired 
                : AiConversationResult.Done;

        } catch (e: any) {
            if (e.name === "ConcurrencyException") {
                throwError("ConcurrencyException", `The conversation was modified by another operation. ChangeVector: ${this._changeVector}`);
            }
            throw e;
        }
    }
}
