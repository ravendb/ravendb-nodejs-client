import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { Stream } from "node:stream";
import type { AiConversationMessagesResult } from "./AiConversationMessagesResult.js";
import type { AiConversationDetailLevel } from "./AiConversationDetailLevel.js";
import { DocumentConventions } from "../../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../../Http/RavenCommand.js";
import { ServerNode } from "../../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../../Primitives/Http.js";
import { throwError } from "../../../../Exceptions/index.js";
import { DateUtil } from "../../../../Utility/DateUtil.js";
import { StringUtil } from "../../../../Utility/StringUtil.js";

export class GetConversationMessagesOptions {
    public conversationId: string;
    public before?: Date;
    public after?: Date;
    public pageSize: number = 2147483647;
    public detailLevel: AiConversationDetailLevel = "Simple";

    public constructor(parameters?: Partial<GetConversationMessagesOptions>) {
        if (parameters) {
            Object.assign(this, parameters);
        }
    }
}

export class GetConversationMessagesOperation implements IMaintenanceOperation<AiConversationMessagesResult> {
    private readonly _parameters: GetConversationMessagesOptions;

    public constructor(conversationId: string);
    public constructor(parameters: GetConversationMessagesOptions);
    public constructor(conversationIdOrParameters: string | GetConversationMessagesOptions) {
        if (typeof conversationIdOrParameters === "string") {
            this._parameters = new GetConversationMessagesOptions({ conversationId: conversationIdOrParameters });
        } else {
            if (!conversationIdOrParameters) {
                throwError("ArgumentNullException", "Parameters cannot be null.");
            }
            this._parameters = conversationIdOrParameters;
        }

        if (StringUtil.isNullOrEmpty(this._parameters.conversationId)) {
            throwError("ArgumentNullException", "ConversationId cannot be null or empty.");
        }

        if (this._parameters.before && this._parameters.after) {
            throwError("InvalidArgumentException", "Before and After cannot both be specified.");
        }

        if (this._parameters.pageSize <= 0) {
            throwError("ArgumentOutOfRangeException", "PageSize must be greater than 0.");
        }
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
        let uri = `${node.url}/databases/${node.database}/ai/agent/conversation/messages`
            + `?conversationId=${encodeURIComponent(this._parameters.conversationId)}`;

        if (this._parameters.before) {
            uri += `&before=${encodeURIComponent(DateUtil.utc.stringify(this._parameters.before))}`;
        }
        if (this._parameters.after) {
            uri += `&after=${encodeURIComponent(DateUtil.utc.stringify(this._parameters.after))}`;
        }

        uri += `&pageSize=${this._parameters.pageSize}`;
        uri += `&detailLevel=${this._parameters.detailLevel}`;

        return {
            method: "GET",
            uri
        };
    }

    async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            // a 404 (conversation not found) arrives with a null body stream; the result stays null
            this.result = null;
            return null;
        }

        let body: string = null;
        const results = await this._defaultPipeline(_ => body = _).process(bodyStream);

        this.result = this._reviveResultTypes<AiConversationMessagesResult>(
            results,
            this._conventions,
            {
                nestedTypes: {
                    lastMessageAt: "date",
                    "messages[].timestamp": "date"
                }
            });

        // The wire always carries these list keys with an explicit null when empty;
        // a null list key revives as an empty list, never null.
        const result = this.result;
        result.messages = result.messages || [];
        result.subConversationIds = result.subConversationIds || [];
        result.attachments = result.attachments || [];
        for (const message of result.messages) {
            message.attachments = message.attachments || [];
            message.toolCalls = message.toolCalls || [];
        }

        // The camelCase pipeline lowercases the first letter of every key, but the wire
        // carries parameter names verbatim; parse them from the raw body instead.
        const rawBody = JSON.parse(body) as { Parameters?: { [key: string]: unknown } };
        result.parameters = rawBody.Parameters || null;

        return body;
    }
}
