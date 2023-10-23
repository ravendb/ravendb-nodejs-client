import { RavenCommand } from "../../Http/RavenCommand";
import { NodeInfo } from "./NodeInfo";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import stream from "readable-stream";

export class GetNodeInfoCommand extends RavenCommand<NodeInfo> {

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/cluster/node-info";

        return {
            method: "GET",
            uri
        }
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    get isReadRequest(): boolean {
        return true;
    }

}

