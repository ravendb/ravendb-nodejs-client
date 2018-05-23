import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestBase } from "../../Primitives/Http";

export class TcpConnectionInfo {
    public url: string;
    public certificate: string;
}

export class GetTcpInfoCommand extends RavenCommand<TcpConnectionInfo> {

    private _tag: string;
    private _dbName: string;
    public requestedNode: ServerNode;

    public constructor(tag: string);
    public constructor(tag: string, dbName?: string) {
        super();
        this._tag = tag;
        this._dbName = dbName;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
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

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        this.result = this._serializer.deserialize(response);
    }

    public get isReadRequest() {
        return true;
    }
}
