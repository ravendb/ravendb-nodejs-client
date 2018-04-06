import { RavenCommand } from "../../Http/RavenCommand";
import { ClusterTopology } from "../../Http/ClusterTopology";
import { HttpRequestBase } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";

export class ClusterTopologyResponse {
    public leader: string;
    public nodeTag: string;
    public topology: ClusterTopology;
}

export class GetClusterTopologyCommand extends RavenCommand<ClusterTopologyResponse> {

    public constructor() {
        super();
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/cluster/topology";

        return {
            uri,
            method: "GET"
        };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        this.result = this.mapper.deserialize(response);
    }

    public get isReadRequest() {
        return true;
    }
}
