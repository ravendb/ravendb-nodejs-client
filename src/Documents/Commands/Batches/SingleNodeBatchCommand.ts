import { RavenCommand } from "../../../Http/RavenCommand";
import { BatchCommandResult } from "../../Session/Operations/BatchCommandResult";
import { IDisposable } from "../../../Types/Contracts";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { ICommandData } from "../CommandData";
import { AttachmentData } from "../../Attachments/index";
import { BatchOptions } from "./BatchOptions";
import { TransactionMode } from "../../Session/TransactionMode";
import { throwError } from "../../../Exceptions/index";
import { PutAttachmentCommandData } from "./PutAttachmentCommandData";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { HeadersBuilder } from "../../../Utility/HttpUtil";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";
import { ServerNode } from "../../../Http/ServerNode";
import { LengthUnawareFormData } from "../../../Utility/LengthUnawareFormData";
import { RavenCommandResponsePipeline } from "../../../Http/RavenCommandResponsePipeline";
import * as stream from "readable-stream";
import { TimeUtil } from "../../../Utility/TimeUtil";
import { PutAttachmentCommandHelper } from "./PutAttachmentCommandHelper";

export class SingleNodeBatchCommand extends RavenCommand<BatchCommandResult> implements IDisposable {
    private _supportsAtomicWrites: boolean;
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

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/bulk_docs?";
        const headers = HeadersBuilder.create().typeAppJson().build();

        const commandsArray = this._commands.reduce(
            (result, command) => [...result, command.serialize(this._conventions)], []);

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
            const attachments = [...this._attachmentStreams]
                .map(attStream => {
                    return {
                        body: attStream,
                        headers: {
                            "Command-Type": "AttachmentStream"
                        }
                    };
                });

            // strip out content type, see: https://stackoverflow.com/questions/39280438/fetch-missing-boundary-in-multipart-form-data-post
            if (request.headers && "Content-Type" in request.headers) {
                const { "Content-Type": contentType, ...restHeaders } = request.headers;
                request.headers = restHeaders;
            }

            const multipart = new LengthUnawareFormData();
            multipart.append("main", body, { header: { ...headers, "Content-Type": "multipart/form-data" } });
            for (let i = 0; i < attachments.length; i++) {
                multipart.append("attachment_" + i, attachments[i].body, { header: attachments[i].headers });
            }
            request.body = multipart;

        } else {
            request.body = body;
            request.headers = headers;
        }

        return request;
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            throwError("InvalidOperationException",
                "Got null response from the server after doing a batch,"
                + " something is very wrong. Probably a garbled response.");
        }

        let body: string = null;
        this.result = await RavenCommandResponsePipeline.create<BatchCommandResult>()
            .collectBody(_ => body = _)
            .parseJsonSync() // TODO: consider parseJsonAsync()
            .objectKeysTransform({
                defaultTransform: "camel",
                ignoreKeys: [/^@/],
            })
            .process(bodyStream);
        return body;
    }

    private _appendOptions(): string {
        if (!this._options) {
            return "";
        }

        let result = "";

        const replicationOptions = this._options.replicationOptions;
        if (replicationOptions) {
            result += `&waitForReplicasTimeout=${TimeUtil.millisToTimeSpan(replicationOptions.timeout)}`;

            result += "&throwOnTimeoutInWaitForReplicas=" + (replicationOptions.throwOnTimeout ? "true" : "false");

            result += "&numberOfReplicasToWaitFor=";
            result += replicationOptions.majority ? "majority" : replicationOptions.replicas;
        }

        const indexOptions = this._options.indexOptions;
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

        return result;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    // tslint:disable-next-line:no-empty
    public dispose(): void {
    }
}
