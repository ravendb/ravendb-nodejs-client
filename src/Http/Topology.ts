import {ServerNode} from './ServerNode';
import {ReadBehavior, ReadBehaviors} from '../Documents/Conventions/ReadBehavior';
import {WriteBehavior, WriteBehaviors} from '../Documents/Conventions/WriteBehavior';

export class Topology {
  protected sla?: number = null;
  private _etag: number = 0;
  private _nodes?: ServerNode[] = null;
  private _leaderNode?: ServerNode = null;
  private _readBehavior: ReadBehavior = ReadBehaviors.LeaderOnly;
  private _writeBehavior: WriteBehavior = WriteBehaviors.LeaderOnly;

  constructor(etag: number = 0, leaderNode: ServerNode = null,
    readBehavior: ReadBehavior = ReadBehaviors.LeaderOnly,
    writeBehavior: WriteBehavior = WriteBehaviors.LeaderOnly,
    nodes: ServerNode[] = null, sla: number = null
  ) {
    this._etag = etag;
    this._leaderNode = leaderNode;
    this._readBehavior = readBehavior;
    this._writeBehavior = writeBehavior;
    this._nodes = nodes || [];
    this.sla = sla || .1;
  }

  public get nodes(): ServerNode[] {
    return this._nodes;
  }

  public get leaderNode(): ServerNode {
    return this._leaderNode;
  }

  public get readBehavior(): ReadBehavior {
    return this._readBehavior;
  }

  public get writeBehavior(): WriteBehavior {
    return this._writeBehavior;
  }

  public get etag(): number {
    return this._etag;
  }
}
