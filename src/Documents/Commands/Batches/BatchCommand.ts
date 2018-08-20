import { IRavenArrayResult } from "../../../Types";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IDisposable } from "../../../Types/Contracts";
import { ICommandData } from "../CommandData";
import { BatchOptions } from "./BatchOptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestBase } from "../../../Primitives/Http";
import { HeadersBuilder } from "../../../Utility/HttpUtil";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";

export class BatchCommand extends RavenCommand<IRavenArrayResult> implements IDisposable {

    private _commands: ICommandData[];
    private _options: BatchOptions;
    // TBD: attachments private readonly HashSet<Stream> _attachmentStreams;

    public constructor(conventions: DocumentConventions, commands: ICommandData[]);
    public constructor(conventions: DocumentConventions, commands: ICommandData[], options: BatchOptions);
    public constructor(conventions: DocumentConventions, commands: ICommandData[], options: BatchOptions = null) {
        super();
        this._commands = commands;
        this._options = options;

        if (!conventions) {
            throwError("InvalidArgumentException", "conventions cannot be null");
        }

        if (!commands) {
            throwError("InvalidArgumentException", "commands cannot be null");
        }

        /* TBD: attachments
            for (var i = 0; i < commands.Count; i++)
            {
                var command = commands[i];
                _commands[i] = context.ReadObject(command.ToJson(conventions, context), "command");

                if (command is PutAttachmentCommandData putAttachmentCommandData)
                {
                    if (_attachmentStreams == null)
                        _attachmentStreams = new HashSet<Stream>();

                    var stream = putAttachmentCommandData.Stream;
                    PutAttachmentCommandHelper.ValidateStream(stream);
                    if (_attachmentStreams.Add(stream) == false)
                        PutAttachmentCommandHelper.ThrowStreamAlready();
                }
            }
            */
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/bulk_docs";
        const headers = HeadersBuilder.create().withContentTypeJson().build();

        const commandsArray = this._commands.reduce(
            (result, command) => [ ...result, command.serialize() ], []);

        // TODO conventions-based entity casing customizations
        const body = JsonSerializer.getDefault().serialize({ Commands: commandsArray });

        const queryString = this._appendOptions();
        const request: HttpRequestBase = { 
            method: "POST", 
            uri: uri + queryString,
            headers,
            body
        };

        return request;

        /* TBD: attachments

        if (_attachmentStreams != null && _attachmentStreams.Count > 0)
        {
            var multipartContent = new MultipartContent {request.Content};
            foreach (var stream in _attachmentStreams)
            {
                PutAttachmentCommandHelper.PrepareStream(stream);
                var streamContent = new AttachmentStreamContent(stream, CancellationToken);
                streamContent.Headers.TryAddWithoutValidation("Command-Type", "AttachmentStream");
                multipartContent.Add(streamContent);
            }
            request.Content = multipartContent;
        }
            */
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            throwError("InvalidOperationException", 
                "Got null response from the server after doing a batch,"
                + " something is very wrong. Probably a garbled response.");
        }

        this.result = this._parseResponseDefault(response);
    }

    private _appendOptions(): string {
        if (!this._options) {
            return "";
        }

        let result = "?";

        if (this._options.waitForReplicas) {
            result += `&waitForReplicasTimeout=${this._options.waitForReplicasTimeout}`;

            if (this._options.throwOnTimeoutInWaitForReplicas) {
                result += "&throwOnTimeoutInWaitForReplicas=true";
            }

            result += "&numberOfReplicasToWaitFor=";
            result += this._options.majority ? "majority" : this._options.numberOfReplicasToWaitFor;
        }

        if (this._options.waitForIndexes) {
            result += "&waitForIndexesTimeout=";
            result += this._options.waitForIndexesTimeout;

            if (this._options.throwOnTimeoutInWaitForIndexes) {
                result += "&waitForIndexThrow=true";
            } else {
                result += "&waitForIndexThrow=false";
            }

            if (this._options.waitForSpecificIndexes 
                && this._options.waitForSpecificIndexes.length) {
                for (const specificIndex of this._options.waitForSpecificIndexes) {
                    result += "&waitForSpecificIndex=" + specificIndex;
                }
            }
        }
    }

    public get isReadRequest(): boolean {
        return false;
    }

    // tslint:disable-next-line:no-empty
    public dispose(): void { }

}
