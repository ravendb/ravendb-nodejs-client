import { RavenCommand } from "../../../Http/RavenCommand.js";
import { BatchCommandResult } from "../../Session/Operations/BatchCommandResult.js";
import { IDisposable } from "../../../Types/Contracts.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { ICommandData } from "../CommandData.js";
import { AttachmentData } from "../../Attachments/index.js";
import { BatchOptions } from "./BatchOptions.js";
import { TransactionMode } from "../../Session/TransactionMode.js";
import { throwError } from "../../../Exceptions/index.js";
import { PutAttachmentCommandData } from "./PutAttachmentCommandData.js";
import { HttpRequestParameters, HttpResponse } from "../../../Primitives/Http.js";
import { HeadersBuilder } from "../../../Utility/HttpUtil.js";
import { JsonSerializer } from "../../../Mapping/Json/Serializer.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { RavenCommandResponsePipeline } from "../../../Http/RavenCommandResponsePipeline.js";
import { Readable, Stream } from "node:stream";
import { TimeUtil } from "../../../Utility/TimeUtil.js";
import { PutAttachmentCommandHelper } from "./PutAttachmentCommandHelper.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";
import { readToBuffer } from "../../../Utility/StreamUtil.js";
import { Dispatcher } from "undici-types";
import { IndexBatchOptions, ReplicationBatchOptions } from "../../Session/IAdvancedSessionOperations.js";
import { ShardedBatchOptions } from "./ShardedBatchOptions.js";

export class SingleNodeBatchCommand extends RavenCommand<BatchCommandResult> implements IDisposable {
    private _supportsAtomicWrites: boolean | null;
    private readonly _attachmentStreams: Set<AttachmentData>;
    private readonly _conventions: DocumentConventions;
    private readonly _commands: ICommandData[];
    private readonly _options: BatchOptions;
    private readonly _mode: TransactionMode;

    public constructor(conventions: DocumentConventions, commands: ICommandData[]);
    public constructor(conventions: DocumentConventions, commands: ICommandData[], options: BatchOptions);
    public constructor(
        conventions: DocumentConventions,
        commands: ICommandData[],
        options: BatchOptions,
        transactionMode: TransactionMode);
    public constructor(
        conventions: DocumentConventions,
        commands: ICommandData[],
        options: BatchOptions = null,
        mode: TransactionMode = null) {
        super();
        this._commands = commands;
        this._conventions = conventions;
        this._options = options;
        this._mode = mode;

        if (!conventions) {
            throwError("InvalidArgumentException", "conventions cannot be null");
        }

        if (!commands) {
            throwError("InvalidArgumentException", "commands cannot be null");
        }

        for (const command of this._commands) {
            if (command instanceof PutAttachmentCommandData) {
                const putAttachmentCommandData = command as PutAttachmentCommandData;
                if (!this._attachmentStreams) {
                    this._attachmentStreams = new Set();
                }

                const { attStream } = putAttachmentCommandData;
                if (this._attachmentStreams.has(attStream)) {
                    PutAttachmentCommandHelper.throwStreamWasAlreadyUsed();
                } else {
                    this._attachmentStreams.add(attStream);
                }
            }
        }
    }

    async send(agent: Dispatcher, requestOptions: HttpRequestParameters): Promise<{
        response: HttpResponse;
        bodyStream: Readable
    }> {
        const { body } = requestOptions;
        if (body instanceof FormData) {
            const attachments = [...this._attachmentStreams]
                .map(attStream => {
                    return {
                        body: attStream,
                        headers: {
                            "Command-Type": "AttachmentStream"
                        }
                    };
                });

            for (let i = 0; i < attachments.length; i++) {
                const part = attachments[i].body;
                const payload = part instanceof Readable ? await readToBuffer(part) : part;
                body.append("attachment_" + i, new Blob([payload], { type: "application/octet-stream" }));
            }
        }

        return super.send(agent, requestOptions);
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/bulk_docs";
        const headers = HeadersBuilder.create().typeAppJson().build();

        if (TypeUtil.isNullOrUndefined(this._supportsAtomicWrites)) {
            this._supportsAtomicWrites = node.supportsAtomicClusterWrites;
        }

        const commandsArray = this._commands.map(x => {
            const serialized = x.serialize(this._conventions);
            if (!this._supportsAtomicWrites) {
                delete serialized["OriginalChangeVector"];
            }

            return serialized;
        })

        const body = JsonSerializer.getDefault().serialize({
            Commands: commandsArray,
            TransactionMode: this._mode === "ClusterWide" ? "ClusterWide" : undefined
        });

        const queryString = this._appendOptions();
        const request: HttpRequestParameters = {
            method: "POST",
            uri: uri + queryString,
        };

        if (this._attachmentStreams && this._attachmentStreams.size > 0) {
            // NOTE: payload is created in send method in async fashion - to support conversion from readable to buffers

            // strip out content type, see: https://stackoverflow.com/questions/39280438/fetch-missing-boundary-in-multipart-form-data-post
            if (request.headers && "Content-Type" in request.headers) {
                const { "Content-Type": contentType, ...restHeaders } = request.headers;
                request.headers = restHeaders;
            }

            const multipart = new FormData();
            multipart.append("main", new Blob([body], { type: "application/json" }));

            request.body = multipart;

        } else {
            request.body = body;
            request.headers = headers;
        }

        return request;
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            throwError("InvalidOperationException",
                "Got null response from the server after doing a batch,"
                + " something is very wrong. Probably a garbled response.");
        }

        let body: string = null;
        this.result = await RavenCommandResponsePipeline.create<BatchCommandResult>()
            .collectBody(_ => body = _)
            .parseJsonSync()
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                ignoreKeys: [/^@/],
                ignorePaths: [/results\.\[\]\.modifiedDocument\./i],
            })
            .process(bodyStream);
        return body;
    }

    protected _appendOptions(): string {
        if (!this._options) {
            return "?";
        }

        return SingleNodeBatchCommand.appendOptions(this._options.indexOptions, this._options.replicationOptions, this._options.shardedOptions);

    }

    protected static appendOptions(indexOptions: IndexBatchOptions, replicationOptions: ReplicationBatchOptions, shardedOptions: ShardedBatchOptions): string {
        let result = "?";

        if (replicationOptions) {
            result += `&waitForReplicasTimeout=${TimeUtil.millisToTimeSpan(replicationOptions.timeout)}`;

            result += "&throwOnTimeoutInWaitForReplicas=" + (replicationOptions.throwOnTimeout ? "true" : "false");

            result += "&numberOfReplicasToWaitFor=";
            result += replicationOptions.majority ? "majority" : replicationOptions.replicas;
        }

        if (indexOptions) {
            result += "&waitForIndexesTimeout=";
            result += TimeUtil.millisToTimeSpan(indexOptions.timeout);

            if (indexOptions.throwOnTimeout) {
                result += "&waitForIndexThrow=true";
            } else {
                result += "&waitForIndexThrow=false";
            }

            if (indexOptions.indexes) {
                for (const specificIndex of indexOptions.indexes) {
                    result += "&waitForSpecificIndex=" + encodeURIComponent(specificIndex);
                }
            }
        }

        if (shardedOptions) {
            if (shardedOptions.batchBehavior !== "Default") {
                result += "&shardedBatchBehavior=" + shardedOptions.batchBehavior;
            }
        }

        return result;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public dispose(): void {
        // empty
    }
}
