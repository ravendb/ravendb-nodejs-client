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

    this._etag = from.Etag || 0;
    this._nodes = (from.Nodes || [])
      .map((node: object): ServerNode =>
      ServerNode.fromJson(node)
    );
  }
}
