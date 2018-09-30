import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { ClusterTopology } from "../../Http/ClusterTopology";
import { HttpRequestParameters } from "../../Primitives/Http";
import { ServerNode } from "../../Http/ServerNode";
import * as stream from "readable-stream";

export class ClusterTopologyResponse {
    public leader: string;
    public nodeTag: string;
    public topology: ClusterTopology;
}

export class GetClusterTopologyCommand extends RavenCommand<ClusterTopologyResponse> {

    public constructor() {
        super();
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/cluster/topology";
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void { //TODO: do we need this method?
        if (!response) {
            this._throwInvalidResponse();
        }

        const resObj = this._serializer.deserialize<IRavenResponse>(response);
        const clusterTpl = Object.assign(new ClusterTopology(), resObj.topology);
        this.result = Object.assign(resObj as ClusterTopologyResponse, { topology: clusterTpl });
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
            });
        return body;
    }

    public get isReadRequest() {
        return true;
    }
}
