import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { Stream } from "node:stream";
import type { AiConversationMessagesResult } from "./AiConversationMessagesResult.js";
import type { AiConversationDetailLevel } from "./AiConversationDetailLevel.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { throwError } from "../../../../Exceptions/index.js";
import { StringUtil } from "../../../../Utility/StringUtil.js";
import { DateUtil } from "../../../../Utility/DateUtil.js";
import { ObjectUtil } from "../../../../Utility/ObjectUtil.js";
import { TypeUtil } from "../../../../Utility/TypeUtil.js";

/**
 * Parameters for reading messages from an AI agent conversation.
 */
export interface GetConversationMessagesOptions {
    /**
     * The conversation document ID.
     */
    conversationId: string;

    /**
     * Return messages older than this timestamp (exclusive upper bound).
     * Used for backward paging (scrolling up in a chatbot UI).
     */
    before?: Date;

    /**
     * Return messages newer than this timestamp (exclusive lower bound).
     * Used for catching up on new messages (e.g., after a Changes() notification).
     */
    after?: Date;

    /**
     * Maximum number of messages to return. Defaults to no limit.
     */
    pageSize?: number;

    /**
     * Controls the level of detail in returned messages.
     * "Simple" (default): user messages (including attachment-only) and assistant messages with content.
     * "Detailed": adds system messages and tool calls with results.
     * "Full": no filtering, includes summaries and internal messages.
     */
    detailLevel?: AiConversationDetailLevel;
}

/**
 * Reads messages from an AI agent conversation, with optional timestamp-based paging and view filtering.
 */
export class GetConversationMessagesOperation implements IMaintenanceOperation<AiConversationMessagesResult> {
    private readonly _parameters: GetConversationMessagesOptions;

    /**
     * @param conversationIdOrParameters - The conversation document ID (returns the most recent messages),
     * or a {@link GetConversationMessagesOptions} object controlling paging and filtering.
     */
    public constructor(conversationIdOrParameters: string | GetConversationMessagesOptions) {
        const parameters = TypeUtil.isString(conversationIdOrParameters)
            ? { conversationId: conversationIdOrParameters }
            : conversationIdOrParameters;

        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }
        if (StringUtil.isNullOrEmpty(parameters.conversationId)) {
            throwError("InvalidArgumentException", "conversationId cannot be null or empty");
        }
        if (parameters.before && parameters.after) {
            throwError("InvalidArgumentException", "before and after cannot both be specified.");
        }
        if (parameters.pageSize != null && parameters.pageSize <= 0) {
            throwError("InvalidArgumentException", "pageSize must be greater than 0.");
        }

        this._parameters = parameters;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<AiConversationMessagesResult> {
        return new GetConversationMessagesCommand(this._parameters, conventions);
    }
}

class GetConversationMessagesCommand extends RavenCommand<AiConversationMessagesResult> {
    private readonly _parameters: GetConversationMessagesOptions;
    private readonly _conventions: DocumentConventions;

    public constructor(parameters: GetConversationMessagesOptions, conventions: DocumentConventions) {
        super();
        this._parameters = parameters;
        this._conventions = conventions;
    }

    get isReadRequest(): boolean {
        return true;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uriParams = new URLSearchParams({
            conversationId: this._parameters.conversationId
        });

        if (this._parameters.before) {
            uriParams.append("before", DateUtil.utc.stringify(this._parameters.before));
        }
        if (this._parameters.after) {
            uriParams.append("after", DateUtil.utc.stringify(this._parameters.after));
        }
        if (this._parameters.pageSize != null) {
            uriParams.append("pageSize", this._parameters.pageSize.toString());
        }

        uriParams.append("detailLevel", this._parameters.detailLevel ?? "Simple");

        const uri = `${node.url}/databases/${node.database}/ai/agent/conversation/messages?${uriParams}`;

        return {
            method: "GET",
            uri
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            // 404 - conversation not found
            this.result = null;
            return null;
        }

        let body: string = null;
        const results = await this._defaultPipeline<object>(_ => body = _)
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                // conversation parameter names are user-provided and case-sensitive
                ignorePaths: [/^parameters\./i]
            })
            .process(bodyStream);

        this.result = this._reviveResultTypes<AiConversationMessagesResult>(
            results,
            this._conventions,
            {
                nestedTypes: {
                    lastMessageAt: "date",
                    "messages[].timestamp": "date"
                }
            });

        return body;
    }
}
