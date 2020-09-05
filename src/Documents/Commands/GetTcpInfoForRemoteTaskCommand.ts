import { RavenCommand } from "../../Http/RavenCommand";
import { TcpConnectionInfo } from "../../ServerWide/Commands/GetTcpInfoCommand";
import { throwError } from "../../Exceptions/index";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";

export class GetTcpInfoForRemoteTaskCommand extends RavenCommand<TcpConnectionInfo> {
    private readonly _remoteDatabase: string;
    private readonly _remoteTask: string;
    private readonly _tag: string;
    private _verifyDatabase: boolean;
    private _requestedNode: ServerNode;

    public constructor(tag: string, remoteDatabase: string, remoteTask: string, verifyDatabase: boolean = false) {
        super();

        if (!remoteDatabase) {
            throwError("InvalidArgumentException", "RemoteDatabase cannot be null");
        }

        this._remoteDatabase = remoteDatabase;

        if (!remoteTask) {
            throwError("InvalidArgumentException", "RemoteTask cannot be null");
        }

        this._remoteTask = remoteTask;
        this._tag = tag;
        this._verifyDatabase = verifyDatabase;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/info/remote-task/tcp?" +
            "database=" + this._urlEncode(this._remoteDatabase) +
            "&remote-task=" + this._urlEncode(this._remoteTask) +
            "&tag=" + this._urlEncode(this._tag);

        if (this._verifyDatabase) {
            uri += "&verify-database=true";
        }

        this._requestedNode = node;

        return {
            method: "GET",
            uri
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public getRequestedNode() {
        return this._requestedNode;
    }

    get isReadRequest(): boolean {
        return false;
    }
}
