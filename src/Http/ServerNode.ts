import {IRavenObject} from "../Types/IRavenObject";
import {UriUtility} from "../Http/UriUtility";

export type ServerNodeRole = "None" | "Promotable" | "Member" | "Rehab";

export class ServerNode {
    public database: string;
    public url: string;
    public clusterTag?: string = null;
    public serverRole: ServerNodeRole;

    public constructor(opts?: { database?: string, url?: string, clusterTag?: string }) {
        if (opts) {
            this.database = opts.database;
            this.url = opts.url;
            this.clusterTag = opts.clusterTag;
        }
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
