import { RunConversationOperation } from "./Agents/RunConversationOperation.js";
import type { AiAgentActionRequest } from "./Agents/AiAgentActionRequest.js";
import type { AiAgentActionResponse, AiAgentArtificialActionResponse } from "./Agents/AiAgentActionResponse.js";
import type { AiConversationCreationOptions } from "./Agents/AiConversationCreationOptions.js";
import type { AiAnswer } from "./AiAnswer.js";
import type { AiStreamCallback } from "./AiStreamCallback.js";
import type { IDocumentStore } from "../../IDocumentStore.js";
import type { UnhandledActionEventArgs } from "./UnhandledActionEventArgs.js";
import { ContentPart, TextPart } from "./ContentPart.js";
import { throwError } from "../../../Exceptions/index.js";
import { StringUtil } from "../../../Utility/StringUtil.js";

export enum AiHandleErrorStrategy {
    SendErrorsToModel = "SendErrorsToModel",
    RaiseImmediately = "RaiseImmediately"
}

export type ActionInvocation = (request: AiAgentActionRequest) => Promise<void>;

export class AiConversation {
    public onUnhandledAction?: (args: UnhandledActionEventArgs) => Promise<void> | void;
    private readonly _store: IDocumentStore;
    private readonly _databaseName: string;
    private readonly _agentId: string;
    private _conversationId: string;
    private readonly _options?: AiConversationCreationOptions;
    private _actionRequests: AiAgentActionRequest[] | null = null;
    private readonly _actionResponses: AiAgentActionResponse[] = [];
    private readonly _artificialActions: AiAgentArtificialActionResponse[] = [];
    private readonly _promptParts: ContentPart[] = [];
    private readonly _invocations: Map<string, ActionInvocation> = new Map();

    public constructor(store: IDocumentStore, databaseName: string, agentId: string, conversationId: string, options?: AiConversationCreationOptions, changeVector?: string) {
        if (!store) throwError("InvalidArgumentException", "store is required");
        if (StringUtil.isNullOrEmpty(databaseName)) throwError("InvalidArgumentException", "databaseName is required");
        if (StringUtil.isNullOrEmpty(agentId)) throwError("InvalidArgumentException", "agentId is required");
        if (StringUtil.isNullOrEmpty(conversationId)) throwError("InvalidArgumentException", "conversationId is required");

        this._store = store;
        this._databaseName = databaseName;
        this._agentId = agentId;
        this._conversationId = conversationId;
        this._options = options;
        this._changeVector = changeVector;
    }

    private _changeVector: string;

    public get changeVector(): string {
        return this._changeVector;
    }

    public get id(): string {
        if (!this._conversationId || this._conversationId.endsWith("/") || this._conversationId.endsWith("|")) {
            throwError("InvalidOperationException", "This is a new conversation, the ID wasn't set yet, you have to call run() first");
        }
        return this._conversationId;
    }

    public requiredActions(): AiAgentActionRequest[] {
        if (!this._actionRequests) {
            throwError("InvalidOperationException", "You must call run() first.");
        }
        return this._actionRequests;
    }

    public addActionResponse<TResponse>(toolId: string, actionResponse: TResponse | string): void {
        if (!toolId) throwError("InvalidArgumentException", "toolId cannot be empty");
        if (actionResponse == null) throwError("InvalidArgumentException", `Action response for '${toolId}' cannot be null.`);

        if (typeof actionResponse === "string") {
            this._actionResponses.push({toolId, content: actionResponse});
            return;
        }
        this._actionResponses.push({toolId, content: JSON.stringify(actionResponse)});
    }

    /**
     * Inject an artificial tool action and a string response into the conversation context.
     * The model will "believe" it executed the tool and received this response.
     */
    public addArtificialActionWithResponse(toolId: string, actionResponse: string): void {
        if (!toolId) {
            throwError("InvalidArgumentException", "toolId cannot be empty");
        }
        if (StringUtil.isNullOrEmpty(actionResponse)) {
            throwError("InvalidArgumentException", "actionResponse cannot be null or empty");
        }

        this._artificialActions.push({toolId, content: actionResponse});
    }

    /**
     * Inject an artificial tool action and a structured response object into the conversation context.
     * The object will be serialized to JSON before being sent.
     */
    public addArtificialActionWithResponseObject<TResponse extends object>(toolId: string, actionResponse: TResponse | string): void {
        if (!toolId) {
            throwError("InvalidArgumentException", "toolId cannot be empty");
        }
        if (actionResponse == null) {
            throwError("InvalidArgumentException", `Action response for '${toolId}' cannot be null.`);
        }

        if (typeof actionResponse === "string") {
            this.addArtificialActionWithResponse(toolId, actionResponse);
            return;
        }

        // Use document conventions' object mapper for serialization if available; otherwise fall back to JSON.stringify.
        const mapper = this._store.conventions?.objectMapper;
        if (mapper) {
            const typeInfo = {};
            const literal = mapper.toObjectLiteral(actionResponse, (ti) => Object.assign(typeInfo, ti));
            this.addArtificialActionWithResponse(toolId, JSON.stringify(literal));
        } else {
            this.addArtificialActionWithResponse(toolId, JSON.stringify(actionResponse));
        }
    }

    /**
     * Sets the user prompt for the next conversation turn.
     * This replaces any previously set prompts.
     * @param userPrompt - The text of the user's message
     */
    public setUserPrompt(userPrompt: string): void {
        if (!userPrompt) throwError("InvalidArgumentException", "userPrompt cannot be empty");
        this._promptParts.length = 0;
        this.addUserPrompt(userPrompt);
    }

    /**
     * Adds one or more user prompts to the conversation.
     * Use this to build multi-part prompts.
     * @param prompts - One or more text prompts to add
     *
     * @example
     * ```typescript
     * conversation.addUserPrompt("First part of the question.");
     * conversation.addUserPrompt("Second part with more context.");
     * ```
     */
    public addUserPrompt(...prompts: string[]): void {
        for (const prompt of prompts) {
            if (!prompt) throwError("InvalidArgumentException", "prompt cannot be empty");
            this._promptParts.push(new TextPart(prompt));
        }
    }

    public handle<TArgs = any>(
        actionName: string,
        action: (args: TArgs) => Promise<object>,
        aiHandleError?: AiHandleErrorStrategy
    ): void;

    public handle<TArgs = any>(
        actionName: string,
        action: (args: TArgs) => object,
        aiHandleError?: AiHandleErrorStrategy
    ): void;

    public handle<TArgs = any>(
        actionName: string,
        action: (request: AiAgentActionRequest, args: TArgs) => Promise<object>,
        aiHandleError?: AiHandleErrorStrategy
    ): void;

    public handle<TArgs = any>(
        actionName: string,
        action: (request: AiAgentActionRequest, args: TArgs) => object,
        aiHandleError?: AiHandleErrorStrategy
    ): void

    public handle<TArgs = any>(
        actionName: string,
        action: ((args: TArgs) => Promise<object> | object) |
            ((request: AiAgentActionRequest, args: TArgs) => Promise<object> | object),
        aiHandleError: AiHandleErrorStrategy = AiHandleErrorStrategy.SendErrorsToModel
    ) {
        const wrappedAction = action.length === 1
            ? (_request: AiAgentActionRequest, args: TArgs) =>
                (action as (args: TArgs) => Promise<object> | object)(args)
            : action as (request: AiAgentActionRequest, args: TArgs) => Promise<object> | object;

        this.receive<TArgs>(actionName, async (req, args) => {
            const result = await wrappedAction(req, args);
            this.addActionResponse(req.toolId, result as any);
        }, aiHandleError);
    }

    public receive<TArgs = any>(actionName: string, action: (request: AiAgentActionRequest, args: TArgs) => Promise<void> | void, aiHandleError: AiHandleErrorStrategy = AiHandleErrorStrategy.SendErrorsToModel): void {
        if (this._invocations.has(actionName)) {
            throwError("InvalidOperationException", `Action '${actionName}' already exists.`);
        }
        const inv: ActionInvocation = async (request) => {
            try {
                const args = this._parseArgs<TArgs>(request.arguments);
                await action(request, args);
            } catch (e) {
                if (aiHandleError === AiHandleErrorStrategy.SendErrorsToModel) {
                    this.addActionResponse(request.toolId, this._createErrorMessageForLlm(e as Error));
                } else {
                    throw e;
                }
            }
        };
        this._invocations.set(actionName, inv);
    }

    public async run<TAnswer>(): Promise<AiAnswer<TAnswer>> {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const r = await this._runInternal<TAnswer>();
            if (r.status === "Done") {
                return r;
            }

            if (!this._actionRequests || this._actionRequests.length === 0) {
                throwError("InvalidOperationException", `There are no action requests to process, but Status was ${r.status}, should not be possible.`);
            }

            for (const action of this._actionRequests) {
                const invocation = this._invocations.get(action.name);
                if (invocation) {
                    await invocation(action);
                } else if (this.onUnhandledAction) {
                    await this.onUnhandledAction({
                        sender: this,
                        action: action
                    });
                } else {
                    throwError("InvalidOperationException",
                        `There is no action defined for action '${action.name}' on agent '${this._agentId}' (${this._conversationId}), ` +
                        `but it was invoked by the model with: ${action.arguments}. ` +
                        `Did you forget to call receive() or handle()? You can also handle unexpected action invocations using the onUnhandledAction event.`);
                }
            }

            if (this._actionResponses.length === 0) {
                return r; // ActionsRequired, nothing to send back yet
            }
        }
    }

    /**
     * Executes one "turn" of the conversation with streaming enabled.
     * Streams the specified property's value in real-time by invoking the callback with each chunk.
     *
     * @param streamPropertyPath - The property path of the answer to stream (e.g., "suggestedReward")
     * @param streamCallback - Callback invoked with each streamed chunk
     * @returns A promise that resolves to the full answer after streaming completes
     *
     * @example
     * ```typescript
     * const answer = await chat.stream<TAnswer>("propertyName", async (chunk) => {
     *     console.log("Received chunk:", chunk);
     * });
     * ```
     */
    public async stream<TAnswer>(streamPropertyPath: string, streamCallback: AiStreamCallback): Promise<AiAnswer<TAnswer>> {
        if (StringUtil.isNullOrEmpty(streamPropertyPath)) {
            throwError("InvalidArgumentException", "streamPropertyPath cannot be empty");
        }
        if (!streamCallback) {
            throwError("InvalidArgumentException", "streamCallback cannot be null");
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const r = await this._runInternal<TAnswer>(streamPropertyPath, streamCallback);
            if (r.status === "Done") {
                return r;
            }

            if (!this._actionRequests || this._actionRequests.length === 0) {
                throwError("InvalidOperationException", `There are no action requests to process, but Status was ${r.status}, should not be possible.`);
            }

            for (const action of this._actionRequests) {
                const invocation = this._invocations.get(action.name);
                if (invocation) {
                    await invocation(action);
                } else if (this.onUnhandledAction) {
                    await this.onUnhandledAction({
                        sender: this,
                        action: action
                    });
                } else {
                    throwError("InvalidOperationException",
                        `There is no action defined for action '${action.name}' on agent '${this._agentId}' (${this._conversationId}), ` +
                        `but it was invoked by the model with: ${action.arguments}. ` +
                        `Did you forget to call receive() or handle()? You can also handle unexpected action invocations using the onUnhandledAction event.`);
                }
            }

            if (this._actionResponses.length === 0) {
                return r; // ActionsRequired, nothing to send back yet
            }
        }
    }

    private async _runInternal<TAnswer>(streamPropertyPath?: string, streamCallback?: AiStreamCallback): Promise<AiAnswer<TAnswer>> {
        if (this._actionRequests != null && this._promptParts.length === 0 && this._actionResponses.length === 0 && this._artificialActions.length === 0) {
            return {status: "Done" as const} as AiAnswer<TAnswer>;
        }

        const op = new RunConversationOperation<TAnswer>(
            this._agentId,
            this._conversationId,
            this._promptParts as ContentPart[],
            this._actionResponses,
            this._artificialActions,
            this._options,
            this._changeVector,
            streamPropertyPath,
            streamCallback
        );

        try {
            const res = await this._store.maintenance.send(op);

            this._changeVector = res.changeVector;
            this._conversationId = res.conversationId;
            this._actionRequests = res.actionRequests;

            return {
                answer: res.response,
                status: (this._actionRequests.length > 0) ? "ActionRequired" : "Done",
                usage: res.usage,
                elapsed: res.elapsed
            };
        } finally {
            // clear prompt, responses and artificial actions after running the conversation
            this._promptParts.length = 0;
            this._actionResponses.length = 0;
            this._artificialActions.length = 0;
        }
    }

    private _parseArgs<TArgs>(argsJson: string): TArgs {
        // If TArgs is string, return as-is
        try {
            return JSON.parse(argsJson) as TArgs;
        } catch {
            // fall back to raw string when not a JSON
            return argsJson as unknown as TArgs;
        }
    }

    private _createErrorMessageForLlm(e: Error): string {
        const lines: string[] = [];
        let curr: any = e;
        let indent = 0;
        while (curr) {
            const pad = "  ".repeat(indent);
            const name = curr?.name || curr?.constructor?.name || "Error";
            const msg = curr?.message || String(curr);
            lines.push(`${pad}${name}: ${msg}`);
            curr = curr?.cause; // Node 20 supports error cause
            indent++;
        }
        return lines.join("\n");
    }
}
