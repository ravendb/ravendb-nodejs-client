import * as stream from "readable-stream";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerNode } from "../../Http/ServerNode";
import { Topology } from "../../Http/Topology";
import { HttpRequestParameters } from "../../Primitives/Http";

interface ServerNodeDto {
    database: string;
    url: string;
    clusterTag?: string;
    serverRole: string;
}

interface TopologyDto {
    etag: number;
    nodes?: ServerNodeDto[];
}

export class GetDatabaseTopologyCommand extends RavenCommand<Topology> {

    private readonly _debugTag: string;

    constructor(debugTag?: string) {
        super();
        this._debugTag = debugTag;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = `${node.url}/topology?name=${node.database}`;

        if (node.url.toLowerCase().indexOf(".fiddler") !== -1) {
            // we want to keep the '.fiddler' stuff there so we'll keep tracking request
            // so we are going to ask the server to respect it
            uri += "&localUrl=" + encodeURIComponent(node.url);
        }

        if (this._debugTag) {
            uri += "&" + this._debugTag;
        }

        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        return this._pipeline<TopologyDto>()
            .collectBody(_ => body = _)
            .parseJsonSync()
            .objectKeysTransform("camel")
            .process(bodyStream)
            .then(rawTpl => {
                const nodes = rawTpl.nodes
                    ? rawTpl.nodes.map(x => Object.assign(new ServerNode(), x))
                    : null;
                this.result = new Topology(rawTpl.etag, nodes);
                return body;
            });
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
