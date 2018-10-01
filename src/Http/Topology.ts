import { ServerNode } from "./ServerNode";

export class Topology {
    public etag: number = 0;
    public nodes?: ServerNode[] = null;

    constructor(etag: number = 0, nodes: ServerNode[] = null) {
        this.etag = etag;
        this.nodes = nodes || [];
    }
}
