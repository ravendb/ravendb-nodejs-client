import { RunConversationOperation } from "./Agents/RunConversationOperation.js";
import type { AiAgentActionRequest } from "./Agents/AiAgentActionRequest.js";
import type { AiAgentActionResponse } from "./Agents/AiAgentActionResponse.js";
import type { AiConversationCreationOptions } from "./Agents/AiConversationCreationOptions.js";
import type { ConversationResult } from "./Agents/ConversationResult.js";
import type { AiAnswer } from "./AiAnswer.js";
import type { IDocumentStore } from "../../IDocumentStore.js";
import { throwError } from "../../../Exceptions/index.js";
import { StringUtil } from "../../../Utility/StringUtil.js";

export enum AiHandleErrorStrategy {
    SendErrorsToModel = "SendErrorsToModel",
    RaiseImmediately = "RaiseImmediately"
}

export type ActionInvocation = (request: AiAgentActionRequest) => Promise<void>;

export class AiConversation {
    private readonly _store: IDocumentStore;
    private readonly _databaseName: string;
    private readonly _agentId: string;
    private _conversationId: string;
    private readonly _options?: AiConversationCreationOptions;
    private _actionRequests: AiAgentActionRequest[] | null = null;
    private readonly _actionResponses: AiAgentActionResponse[] = [];
    private _userPrompt?: string;
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

    public setUserPrompt(userPrompt: string): void {
        if (!userPrompt) throwError("InvalidArgumentException", "userPrompt cannot be empty");
        this._userPrompt = userPrompt;
    }

    public handle<TArgs = any>(actionName: string, action: (request: AiAgentActionRequest, args: TArgs) => Promise<object> | object, aiHandleError: AiHandleErrorStrategy = AiHandleErrorStrategy.SendErrorsToModel): void {
        this.receive<TArgs>(actionName, async (req, args) => {
            const result = await action(req, args);
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
                }
            }

            if (this._actionResponses.length === 0) {
                return r; // ActionsRequired, nothing to send back yet
            }
        }
    }

    private async _runInternal<TAnswer>(): Promise<AiAnswer<TAnswer>> {
        if (this._actionRequests != null && !this._userPrompt && this._actionResponses.length === 0) {
            return {status: "Done" as const} as AiAnswer<TAnswer>;
        }

        const op = new RunConversationOperation<TAnswer>(
            this._agentId,
            this._conversationId,
            this._userPrompt,
            this._actionResponses,
            this._options,
            this._changeVector
        );

        try {
            const res = await this._store.maintenance.forDatabase(this._databaseName).send(op) as unknown as ConversationResult<TAnswer>;
            this._changeVector = res.changeVector;
            this._conversationId = res.conversationId;
            this._actionRequests = res.actionRequests ?? [];

            return {
                answer: res.response,
                status: (this._actionRequests.length > 0) ? "ActionRequired" : "Done"
            };
        } finally {
            // clear prompt and responses after running the conversation
            this._userPrompt = undefined;
            this._actionResponses.length = 0;
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
