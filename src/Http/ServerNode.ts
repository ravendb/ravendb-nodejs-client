import { IRavenObject } from "../Types/IRavenObject.js";
import { UriUtility } from "./UriUtility.js";
import { ClusterTopology } from "./ClusterTopology.js";
import { Topology } from "./Topology.js";

export type ServerNodeRole = "None" | "Promotable" | "Member" | "Rehab";

export class ServerNode {
    public database: string;
    public url: string;
    public clusterTag?: string = null;
    public serverRole: ServerNodeRole;
    public supportsAtomicClusterWrites: boolean;

    private _lastServerVersionCheck: number = 0;
    private _lastServerVersion: string;

    public constructor(opts?: { database?: string, url?: string, clusterTag?: string, serverRole?: ServerNodeRole }) {
        if (opts) {
            this.database = opts.database;
            this.url = opts.url;
            this.clusterTag = opts.clusterTag;
            this.serverRole = opts.serverRole;
        }
    }

    public shouldUpdateServerVersion(): boolean {
        if (!this._lastServerVersion || this._lastServerVersionCheck > 100) {
            return true;
        }

        this._lastServerVersionCheck++;
        return false;
    }

    public updateServerVersion(serverVersion: string): void {
        this._lastServerVersion = serverVersion;
        this._lastServerVersionCheck = 0;

        this.supportsAtomicClusterWrites = false;

        if (serverVersion) {
            const tokens = serverVersion.split(".");
            try {
                const major = Number.parseInt(tokens[0], 10);
                const minor = Number.parseInt(tokens[1], 10);

                if (major > 5 || (major === 5 && minor >= 2)) {
                    this.supportsAtomicClusterWrites = true;
                }
            } catch {
                // ignore
            }
        }
    }

    public discardServerVersion(): void {
        this._lastServerVersion = null;
        this._lastServerVersionCheck = 0;
    }

    public static createFrom(topology: ClusterTopology, etag: number): Topology {
        const newTopology = new Topology();
        newTopology.etag = etag;
        newTopology.nodes = [];
        newTopology.promotables = [];

        if (!topology) {
            return newTopology;
        }

        for (const node of Object.keys(topology.members)) {
            const member = topology.members[node];

            newTopology.nodes.push(new ServerNode({
                url: member,
                clusterTag: node,
                serverRole: "Member"
            }));
        }

        for (const node of Object.keys(topology.watchers)) {
            const watcher = topology.watchers[node];

            newTopology.nodes.push(new ServerNode({
                url: watcher,
                clusterTag: node,
                serverRole: "Member"
            }));
        }

        return newTopology;
    }

    public get lastServerVersion() {
        return this._lastServerVersion;
    }

    public get isSecure(): boolean {
        return UriUtility.isSecure(this.url);
    }

    public fromJson(json: object): void {
        const from: IRavenObject = json as IRavenObject;

        this.url = from.Url;
        this.database = from.Database || null;
        this.clusterTag = from.ClusterTag || null;
    }

    public static fromJson(json: object): ServerNode {
        const node = new ServerNode({
            database: "",
            url: ""
        });

        node.fromJson(json);
        return node;
    }
}
