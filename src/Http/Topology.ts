import * as _ from "lodash";
import { ServerNode } from "./ServerNode";
import { IRavenObject } from "../Types/IRavenObject";

export class Topology {
  public etag: number = 0;
  public nodes?: ServerNode[] = null;

  constructor(etag: number = 0, nodes: ServerNode[] = null) {
    this.etag = etag;
    this.nodes = nodes || [];
  }

  public static fromJson(json: object): Topology {
    const topology: Topology = new (this as typeof Topology)();

    topology.fromJson(json);
    return topology;
  }

  public fromJson(json: object): void {
    const from: IRavenObject = json as IRavenObject;
    let nodes: object[] = [];

    this.etag = from.Etag || 0;

    if (from.Topology && from.Topology.AllNodes) {
      _.forIn(from.Topology.AllNodes, (url: string, tag: string) => {
        nodes.push({ Url: url, ClusterTag: tag });
      });
    } else if (from.Nodes) {
      nodes = from.Nodes;
    }

    this.nodes = nodes
      .map((node: object): ServerNode =>
        ServerNode.fromJson(node)
      );
  }
}
