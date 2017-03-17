import {ServerNode} from './ServerNode';
import {ReadBehavior, ReadBehaviors} from '../Documents/Conventions/ReadBehavior';
import {WriteBehavior, WriteBehaviors} from '../Documents/Conventions/WriteBehavior';

export class Topology {
  protected etag: number = 0;
  protected sla?: number = null;
  protected nodes?: ServerNode[] = null;
  protected leaderNode?: ServerNode = null;
  protected readBehavior: ReadBehavior = ReadBehaviors.LeaderOnly;
  protected writeBehavior: WriteBehavior = WriteBehaviors.LeaderOnly;

  constructor(etag: number = 0, leaderNode: ServerNode = null,
    readBehavior: ReadBehavior = ReadBehaviors.LeaderOnly,
    writeBehavior: WriteBehavior = WriteBehaviors.LeaderOnly,
    nodes: ServerNode[] = null, sla: number = null
  ) {
    this.etag = etag;
    this.leaderNode = leaderNode;
    this.readBehavior = readBehavior;
    this.writeBehavior = writeBehavior;
    this.nodes = nodes || [];
    this.sla = sla || .1;
  }
}
