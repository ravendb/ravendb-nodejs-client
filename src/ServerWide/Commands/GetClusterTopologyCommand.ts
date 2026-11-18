import { RavenCommand } from "../../Http/RavenCommand.js";
import { ClusterTopology } from "../../Http/ClusterTopology.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { ServerNode, ServerNodeRole } from "../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { ClusterNodeStatus } from "../../Http/ClusterNodeStatus.js";
import { DateUtil } from "../../Utility/DateUtil.js";
import { ObjectUtil } from "../../Utility/ObjectUtil.js";

export class ClusterTopologyResponse {
    public leader: string;
    public nodeTag: string;
    public serverRole: ServerNodeRole;
    public topology: ClusterTopology;
    public etag: number;
    public status: Map<string, ClusterNodeStatus>;
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

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        const result = await this._pipeline<ClusterTopologyResponse>()
            .collectBody(b => body = b)
            .parseJsonSync()
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                ignorePaths: [/topology\.(members|promotables|watchers|allNodes)\./i, /^status\.[^.]+$/i]
            })
            .process(bodyStream);

        const clusterTpl = Object.assign(new ClusterTopology(), result.topology);
        this.result = Object.assign(result as ClusterTopologyResponse, { topology: clusterTpl });
        this.result.status = new Map(Object.entries(this.result.status).map(([tag, status]) => [tag, {
            ...status,
            lastSent: DateUtil.utc.parse(status.lastSent as unknown as string),
            lastReply: DateUtil.utc.parse(status.lastReply as unknown as string)
        }]));
        return body;
    }

    public get isReadRequest() {
        return true;
    }
}
