import * as BluebirdPromise from 'bluebird';
import {RequestExecutor, ITopologyUpdateEvent} from "./RequestExecutor";
import {ServerNode} from "../ServerNode";
import {Topology} from "../Topology";
import {IRavenObject} from "../../Database/IRavenObject";
import {InvalidOperationException} from "../../Database/DatabaseExceptions";
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {Lock} from "../../Lock/Lock";

export class NodeSelector {
  private _lock: Lock;
  private _currentNodeIndex: number = 0;
  protected initialDatabase: string;
  protected topology: Topology;

  public get nodes(): ServerNode[] {
    this.assertTopology();

    return this.topology.nodes;
  }

  public get currentNodeIndex(): number {
    return this._currentNodeIndex;
  }

  public get topologyEtag(): number {
    return this.topology.etag;
  }

  public get currentNode(): ServerNode {
    return this.nodes[this._currentNodeIndex];
  }

  constructor(requestExecutor: RequestExecutor, topology: Topology) {
    const {TOPOLOGY_UPDATED, REQUEST_FAILED, NODE_STATUS_UPDATED} = RequestExecutor;

    this._lock = Lock.make();
    this.topology = topology;    

    requestExecutor.on<ITopologyUpdateEvent>(TOPOLOGY_UPDATED, 
      (data: ITopologyUpdateEvent): void => this.onTopologyUpdated(data)
    );

    requestExecutor.on<ServerNode>(REQUEST_FAILED, 
      (data: ServerNode): void => this.onRequestFailed(data)
    );

    requestExecutor.on<ServerNode>(NODE_STATUS_UPDATED, 
      (data: ServerNode): void => this.onNodeRestored(data)
    );
  }

  protected assignTopology(topology: Topology, forceUpdate: boolean): BluebirdPromise<void> {
    const oldTopology: Topology = this.topology;

    return this._lock.acquire((): any => {
      if (!forceUpdate) {
        this._currentNodeIndex = 0;
      }

      if (oldTopology === this.topology) {
        this.topology = topology;
        return true;
      }

      return false;
    })
    .catch((): boolean => false)
    .then((wasUpdated): BluebirdPromise.Thenable<void> => {
      if (!wasUpdated) {
        return this.assignTopology(topology, forceUpdate);
      }

      return BluebirdPromise.resolve();
    });
  }

  protected onTopologyUpdated(event: ITopologyUpdateEvent): void {
    let shouldUpdate: boolean = false;
    const forceUpdate: boolean = (true === event.forceUpdate);

    if (event.topologyJson) {
      const topology: Topology = Topology.fromJson(event.topologyJson);

      if (topology.nodes.length) {
        shouldUpdate = forceUpdate || (this.topology.etag < topology.etag);        
      }

      if (shouldUpdate) {
        this.assignTopology(topology, forceUpdate);
      }
    }

    event.wasUpdated = shouldUpdate;
  }

  protected onRequestFailed(failedNode: ServerNode): void {
    this.assertTopology();

    //failedNode.isFailed = true;
    this._currentNodeIndex = ++this._currentNodeIndex % this.topology.nodes.length;
  }

  protected onNodeRestored(failedNode: ServerNode): void {
    const nodes: ServerNode[] = this.topology.nodes;

    if (nodes.includes(failedNode)) {
      const failedNodeIndex: number = nodes.indexOf(failedNode);
      //failedNode.isFailed = false;
      
      if (this._currentNodeIndex > failedNodeIndex) {
        this._currentNodeIndex = failedNodeIndex;
      }
    }
  }

  protected assertTopology(): void | never {
    if (!this.topology || !this.topology.nodes || !this.topology.nodes.length) {
      throw new InvalidOperationException("Empty database topology, this shouldn't happen.");
    }
  }
}