import { IMaintenanceOperation, OperationResultType } from "../../OperationAbstractions.js";
import { Readable, Stream } from "node:stream";
import { createInterface } from "node:readline";
import type { AiAgentActionResponse } from "./AiAgentActionResponse.js";
import type { AiConversationCreationOptions } from "./AiConversationCreationOptions.js";
import type { ConversationResult } from "./ConversationResult.js";
import type { AiStreamCallback } from "../AiStreamCallback.js";
import { ContentPart, TextPart } from "../ContentPart.js";
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
    private readonly _promptParts: ContentPart[];
    private readonly _actionResponses?: AiAgentActionResponse[];
    private readonly _options?: AiConversationCreationOptions;
    private readonly _changeVector?: string;
    private readonly _streamPropertyPath?: string;
    private readonly _streamCallback?: AiStreamCallback;

    public constructor(
        agentId: string,
        conversationId: string,
        promptParts: ContentPart[] | string,
        actionResponses?: AiAgentActionResponse[],
        options?: AiConversationCreationOptions,
        changeVector?: string,
        streamPropertyPath?: string,
        streamCallback?: AiStreamCallback
    ) {
        if (StringUtil.isNullOrEmpty(agentId)) {
            throwError("InvalidArgumentException", "agentId cannot be null or empty.");
        }
        if (StringUtil.isNullOrEmpty(conversationId)) {
            throwError("InvalidArgumentException", "conversationId cannot be null or empty.");
        }

        // Both streamPropertyPath and streamCallback must be specified together or neither
        if ((streamPropertyPath != null) !== (streamCallback != null)) {
            throwError("InvalidOperationException", "Both streamPropertyPath and streamCallback must be specified together or neither.");
        }

        this._agentId = agentId;
        this._conversationId = conversationId;

        // Backward compatibility: convert string to ContentPart[]
        if (typeof promptParts === "string") {
            this._promptParts = promptParts ? [new TextPart(promptParts)] : [];
        } else {
            this._promptParts = promptParts || [];
        }

        this._actionResponses = actionResponses;
        this._options = options;
        this._changeVector = changeVector;
        this._streamPropertyPath = streamPropertyPath;
        this._streamCallback = streamCallback;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<ConversationResult<TAnswer>> {
        return new RunConversationCommand<TAnswer>(
            this._conversationId,
            this._agentId,
            this._promptParts,
            this._actionResponses,
            this._options,
            this._changeVector,
            conventions,
            this._streamPropertyPath,
            this._streamCallback
        );
    }
}

class RunConversationCommand<TAnswer>
    extends RavenCommand<ConversationResult<TAnswer>> implements IRaftCommand {

    private readonly _conversationId: string;
    private readonly _agentId: string;
    private readonly _promptParts: ContentPart[];
    private readonly _actionResponses?: AiAgentActionResponse[];
    private readonly _options?: AiConversationCreationOptions;
    private readonly _changeVector?: string;
    private readonly _streamPropertyPath?: string;
    private readonly _streamCallback?: AiStreamCallback;
    private _raftId: string;

    public constructor(
        conversationId: string,
        agentId: string,
        promptParts: ContentPart[],
        actionResponses: AiAgentActionResponse[] | undefined,
        options: AiConversationCreationOptions | undefined,
        changeVector: string | undefined,
        conventions: DocumentConventions,
        streamPropertyPath?: string,
        streamCallback?: AiStreamCallback
    ) {
        super();
        this._conversationId = conversationId;
        this._agentId = agentId;
        this._promptParts = promptParts;
        this._actionResponses = actionResponses;
        this._options = options;
        this._changeVector = changeVector;
        this._streamPropertyPath = streamPropertyPath;
        this._streamCallback = streamCallback;

        // When streaming is enabled, we need to handle raw response
        if (this._streamPropertyPath && this._streamCallback) {
            this._responseType = "Raw";
        }

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

        if (this._streamPropertyPath) {
            uriParams.append("streaming", "true");
            uriParams.append("streamPropertyPath", this._streamPropertyPath);
        }

        const uri = `${node.url}/databases/${node.database}/ai/agent?${uriParams}`;

        const bodyObj = {
            ActionResponses: this._actionResponses,
            UserPrompt: this._promptParts.length > 0 ? this._promptParts : null,
            CreationOptions: this._options ?? {}
        };

        const headers = this._headers().typeAppJson().build();

        // Serialize properties to PascalCase, except "parameters" in CreationOptions, which must keep user-provided, case-sensitive keys unchanged.
        const serialized = ObjectUtil.transformObjectKeys(bodyObj, {
            defaultTransform: ObjectUtil.pascalCase,
            ignorePaths: [
                new RegExp("^CreationOptions\\.Parameters\\..*$"),
                new RegExp("^UserPrompt\\..*$")
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

        if (this._streamPropertyPath && this._streamCallback) {
            return await this._processStreamingResponse(bodyStream as Readable);
        }

        return await this._parseResponseDefaultAsync(bodyStream);
    }

    private async _processStreamingResponse(bodyStream: Readable): Promise<string> {
        const rl = createInterface({
            input: bodyStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            if (!line || line.trim().length === 0) {
                continue;
            }

            if (line.startsWith("{")) {
                const jsonStream = Readable.from([line]);
                let body: string = null;
                this.result = await this._defaultPipeline(_ => body = _).process(jsonStream);
                return body;
            }

            try {
                const unescaped = JSON.parse(line);
                await this._streamCallback!(unescaped);
            } catch (err) {
                await this._streamCallback!(line);
            }
        }

        if (!this.result) {
            throwError("InvalidOperationException", "No final result received in streaming response");
        }

        return null;
    }
}