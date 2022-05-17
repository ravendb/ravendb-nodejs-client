import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";

export class TcpConnectionInfo {
    public url: string;
    public certificate: string;
    public urls: string[];
    public nodeTag: string;
    public serverId: string;
}

export class GetTcpInfoCommand extends RavenCommand<TcpConnectionInfo> {

    private readonly _tag: string;
    private readonly _dbName: string;
    public requestedNode: ServerNode;

    public constructor(tag: string);
    public constructor(tag: string, dbName: string);
    public constructor(tag: string, dbName?: string) {
        super();
        this._tag = tag;
        this._dbName = dbName;
        this.timeout = 15_000;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri;
        if (!this._dbName) {
            uri = `${node.url}/info/tcp?tcp=${this._tag}`;
        } else {
            uri = `${node.url}/databases/${this._dbName}/info/tcp?tcp=${this._tag}`;
        }

        this.requestedNode = node;
        return {
            uri,
            method: "GET"
        };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest() {
        return true;
    }
}
