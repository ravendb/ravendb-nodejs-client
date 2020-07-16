import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { ClusterTopology } from "../../Http/ClusterTopology";
import { HttpRequestParameters } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";
import { NodeStatus } from "../../Http/RequestExecutor";

export class ClusterTopologyResponse {
    public leader: string;
    public nodeTag: string;
    public topology: ClusterTopology;
    public status: Map<string, NodeStatus>;
}

export class GetClusterTopologyCommand extends RavenCommand<ClusterTopologyResponse> {

    private readonly _debugTag: string;

    public constructor(debugTag?: string) {
        super();

        this._debugTag = debugTag;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/cluster/topology";

        if (this._debugTag) {
            uri += "?" + this._debugTag;
        }

        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        await this._defaultPipeline(x => body = x).process(bodyStream)
            .then(result => {
                const clusterTpl = Object.assign(new ClusterTopology(), result.topology);
                this.result = Object.assign(result as ClusterTopologyResponse, { topology: clusterTpl });
                this.result.status = new Map(Object.entries(this.result.status));
            });
        return body;
    }

    public get isReadRequest() {
        return true;
    }
}
