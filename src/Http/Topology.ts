import * as _ from "lodash";
import {ServerNode} from './ServerNode';
import {IJsonConvertible} from "../Json/Contracts";
import {IRavenObject} from "../Database/IRavenObject";

export class Topology implements IJsonConvertible {
  private _etag: number = 0;
  private _nodes?: ServerNode[] = null;

  public static fromJson(json: object): Topology {
    const topology: Topology = new (<typeof Topology>this)();

    topology.fromJson(json);
    return topology;
  }

  constructor(etag: number = 0, nodes: ServerNode[] = null) {
    this._etag = etag;
    this._nodes = nodes || [];
  }

  public get nodes(): ServerNode[] {
    return this._nodes;
  }

  public get etag(): number {
    return this._etag;
  }

  public fromJson(json: object): void {
    const from: IRavenObject = <IRavenObject>json;
    let nodes: object[] = [];

    this._etag = from.Etag || 0;

    if (from.Topology && from.Topology.AllNodes) {
      _.forIn<string>(from.Topology.AllNodes, (url: string, tag: string) => 
        nodes.push({Url: url, ClusterTag: tag})
      );
    } else if (from.Nodes) {
      nodes = from.Nodes;
    }

    this._nodes = nodes
      .map((node: object): ServerNode =>
      ServerNode.fromJson(node)
    );
  }
}
