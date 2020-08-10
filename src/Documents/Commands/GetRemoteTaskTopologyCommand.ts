import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { throwError } from "../../Exceptions/index";
import { HttpRequestParameters } from "../../Primitives/Http";

export class GetRemoteTaskTopologyCommand extends RavenCommand<string[]> {
    private readonly _remoteDatabase: string;
    private readonly _databaseGroupId: string;
    private readonly _remoteTask: string;

    private requestedNode: ServerNode;

    public constructor(remoteDatabase: string, databaseGroupId: string, remoteTask: string) {
        super();

        if (!remoteDatabase) {
            throwError("InvalidArgumentException", "RemoteDatabase cannot be null");
        }

        this._remoteDatabase = remoteDatabase;

        if (!databaseGroupId) {
            throwError("InvalidArgumentException", "DatabaseGroupID cannot be null");
        }

        this._databaseGroupId = databaseGroupId;

        if (!remoteTask) {
            throwError("InvalidArgumentException", "RemoteTsk cannot be null");
        }

        this._remoteTask = remoteTask;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/info/remote-task/topology?"
            + "database=" + this._urlEncode(this._remoteDatabase)
            + "&remote=" + this._urlEncode(this._remoteTask)
            + "&groupId=" + this._urlEncode(this._databaseGroupId);

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

    get isReadRequest(): boolean {
        return false;
    }

    public getRequestedNode(): ServerNode {
        return this.requestedNode;
    }
}
