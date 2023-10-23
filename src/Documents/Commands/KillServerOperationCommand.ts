import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";


export class KillServerOperationCommand extends RavenCommand<void> {
    private readonly _id: number;

    public constructor(id: number)
    public constructor(id: number, nodeTag: string)
    public constructor(id: number, nodeTag?: string) {
        super();

        this._id = id;

        if (nodeTag) {
            this._selectedNodeTag = nodeTag;
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = `${node.url}/admin/operations/kill?id=${this._id}`;

        return {
            uri,
            method: "POST"
        }
    }

}
