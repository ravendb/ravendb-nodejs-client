import * as _ from "lodash";
import { ServerNode } from "./ServerNode";
import { IJsonConvertible } from "../Typedef/Contracts";
import { IRavenObject } from "../Typedef/IRavenObject";

export class Topology implements IJsonConvertible {
  private _etag: number = 0;
  private _nodes?: ServerNode[] = null;

  constructor(etag: number = 0, nodes: ServerNode[] = null) {
    this._etag = etag;
    this._nodes = nodes || [];
  }

  public get nodes(): ServerNode[] {
    return this._nodes;
  }

  public set nodes(value) {
    this._nodes = value;
  }

  public get etag(): number {
    return this._etag;
  }

  public set etag(value) {
    this._etag = value;
  }

  public static fromJson(json: object): Topology {
    const topology: Topology = new (this as typeof Topology)();

    topology.fromJson(json);
    return topology;
  }

  public fromJson(json: object): void {
    const from: IRavenObject = json as IRavenObject;
    let nodes: object[] = [];

    this._etag = from.Etag || 0;

    if (from.Topology && from.Topology.AllNodes) {
      _.forIn(from.Topology.AllNodes, (url: string, tag: string) => {
        nodes.push({ Url: url, ClusterTag: tag });
      });
    } else if (from.Nodes) {
      nodes = from.Nodes;
    }

    this._nodes = nodes
      .map((node: object): ServerNode =>
        ServerNode.fromJson(node)
      );
  }
}
