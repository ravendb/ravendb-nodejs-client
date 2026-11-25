import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";

export class WaitForRaftIndexCommand extends RavenCommand<void> {
    private readonly _index: number;

    public constructor(index: number, nodeTag?: string) {
        super();

        this._index = index;
        this._responseType = "Empty";

        if (nodeTag) {
            this._selectedNodeTag = nodeTag;
        }
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: node.url + "/rachis/waitfor?index=" + this._index,
            method: "GET"
        };
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
