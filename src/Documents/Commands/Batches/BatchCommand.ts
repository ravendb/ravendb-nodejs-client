import * as stream from "readable-stream";
import { PutAttachmentCommandData } from "./PutAttachmentCommandData";
import { PutAttachmentCommandHelper } from "./PutAttachmentCommandHelper";
import { IRavenArrayResult } from "../../../Types";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IDisposable } from "../../../Types/Contracts";
import { ICommandData } from "../CommandData";
import { BatchOptions } from "./BatchOptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { HeadersBuilder } from "../../../Utility/HttpUtil";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";
import { RavenCommandResponsePipeline } from "../../../Http/RavenCommandResponsePipeline";
import { TimeUtil } from "../../../Utility/TimeUtil";
import { AttachmentData } from "../../Attachments";

export class BatchCommand extends RavenCommand<IRavenArrayResult> implements IDisposable {

    private readonly _commands: ICommandData[];
    private readonly _attachmentStreams: Set<AttachmentData>;
    private readonly _options: BatchOptions;
    private readonly _conventions: DocumentConventions;

    public constructor(conventions: DocumentConventions, commands: ICommandData[]);
    public constructor(conventions: DocumentConventions, commands: ICommandData[], options: BatchOptions);
    public constructor(conventions: DocumentConventions, commands: ICommandData[], options: BatchOptions = null) {
        super();
        this._commands = commands;
        this._conventions = conventions;
        this._options = options;

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
                    PutAttachmentCommandHelper.throwStreamAlready();
                } else {
                    this._attachmentStreams.add(attStream);
                }
            }
        }
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/bulk_docs";
        const headers = HeadersBuilder.create().typeAppJson().build();

        const commandsArray = this._commands.reduce(
            (result, command) => [...result, command.serialize(this._conventions)], []);

        const body = JsonSerializer.getDefault().serialize({ Commands: commandsArray });

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
            request.headers = Object.assign(request.headers || {}, { "Content-Type": "multipart/mixed" });
            request.multipart = [{ headers, body }, ...attachments];
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
        this.result = await RavenCommandResponsePipeline.create<IRavenArrayResult>()
            .collectBody(_ => body = _)
            .parseJsonSync()
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

        let result = "?";

        const replicationOptions = this._options.replicationOptions;
        if (replicationOptions) {
            result += `&waitForReplicasTimeout=${TimeUtil.millisToTimeSpan(replicationOptions.timeout)}`;

            if (replicationOptions.throwOnTimeout) {
                result += "&throwOnTimeoutInWaitForReplicas=true";
            }

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

            if (indexOptions.indexes && indexOptions.indexes.length) {
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
