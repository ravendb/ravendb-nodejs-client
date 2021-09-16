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

    private readonly _applicationIdentifier: string;
    private readonly _debugTag: string;

    constructor(debugTag?: string, applicationIdentifier?: string) {
        super();
        this._debugTag = debugTag;
        this._applicationIdentifier = applicationIdentifier;

        this.timeout = 15_000;
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

        if (this._applicationIdentifier) {
            uri += "&applicationIdentifier=" + this._urlEncode(this._applicationIdentifier);
        }

        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const rawTpl = await this._pipeline<TopologyDto>()
            .collectBody(_ => body = _)
            .parseJsonSync()
            .objectKeysTransform("camel")
            .process(bodyStream);

        const nodes = rawTpl.nodes
            ? rawTpl.nodes.map(x => Object.assign(new ServerNode(), x))
            : null;
        this.result = new Topology(rawTpl.etag, nodes);
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
