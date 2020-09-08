import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class AddClusterNodeCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _url: string;
    private readonly _tag: string;
    private readonly _watcher: boolean;

    public constructor(url: string, tag?: string, watcher = false) {
        super();

        this._url = url;
        this._tag = tag;
        this._watcher = watcher;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/admin/cluster/node?url=" + this._urlEncode(this._url) + "&watcher=" + this._watcher;

        if (this._tag) {
            uri += "&tag=" + this._tag;
        }

        return {
            uri,
            method: "Put"
        }
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
