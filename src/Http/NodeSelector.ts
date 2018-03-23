import * as BluebirdPromise from "bluebird";
import * as _ from "lodash";
import * as moment from "moment";
import { RequestExecutor, ITopologyUpdateEvent } from "./RequestExecutor";
import { ServerNode, ServerNodeRole } from "../Http/ServerNode";
import CurrentIndexAndNode from "../Http/CurrentIndexAndNode";
import { Topology } from "./Topology";
import {
  InvalidOperationException,
  AllTopologyNodesDownException
} from "../Database/DatabaseExceptions";
import { Timer } from "../Primitives/Timer";

class NodeSelectorState {
  public topology: Topology;
  public currentNodeIndex: number;
  public nodes: ServerNode[];
  public failures: number[];
  public fastestRecords: number[];
  public fastest: number;
  public speedTestMode = 1;

  constructor(currentNodeIndex: number, topology: Topology) {
    this.topology = topology;
    this.currentNodeIndex = currentNodeIndex;
    this.nodes = topology.nodes;
    this.failures = _.times(topology.nodes.length, () => 0);
    this.fastestRecords = _.times(topology.nodes.length);

  }
}
export class NodeSelector {

  private _updateFastestNodeTimer: Timer;
  private _state: NodeSelectorState;

  constructor(topology: Topology) {
    this._state = new NodeSelectorState(0, topology);
  }

  public getTopology(): Topology {
    return this._state.topology;
  }

  public onFailedRequest(nodeIndex: number): void {
    const state: NodeSelectorState = this._state;
    if (nodeIndex < 0 || nodeIndex >= state.failures.length) {
      return; // probably already changed
    }

    state.failures[nodeIndex]++;
  }

  public onUpdateTopology(topology: Topology, forceUpdate: boolean = false): boolean {
    if (!topology) {
      return false;
    }

    const stateEtag: number = this._state.topology.etag || 0;
    const topologyEtag: number = this._state.topology.etag || 0;

    if (stateEtag >= topologyEtag && !forceUpdate) {
      return false;
    }

    this._state = new NodeSelectorState(0, topology);

    return true;
  }

  public getNodeBySessionId(sessionId: number): CurrentIndexAndNode {
    const state = this._state;
    const index = sessionId % state.topology.nodes.length;

    for (let i = index; i < state.failures.length; i++) {
      if (state.failures[i] === 0
        && state.nodes[i].serverRole === ServerNodeRole.MEMBER) {
        return new CurrentIndexAndNode(i, state.nodes[i]);
      }
    }

    for (let i = 0; i < index; i++) {
      if (state.failures[i] === 0
        && state.nodes[i].serverRole === ServerNodeRole.MEMBER) {
        return new CurrentIndexAndNode(i, state.nodes[i]);
      }
    }

    return this.getPreferredNode();
  }

  public getPreferredNode(): CurrentIndexAndNode {
    const state = this._state;
    const stateFailures = state.failures;
    const serverNodes = state.nodes;
    const len = Math.min(serverNodes.length, stateFailures.length);

    for (let i = 0; i < len; i++) {
      if (stateFailures[i] === 0 && serverNodes[i].url) {
        return new CurrentIndexAndNode(i, serverNodes[i]);
      }
    }

    return NodeSelector._unlikelyEveryoneFaultedChoice(state);
  }

  private static _unlikelyEveryoneFaultedChoice(state: NodeSelectorState): CurrentIndexAndNode {
    // if there are all marked as failed, we'll chose the first
    // one so the user will get an error (or recover :-) );
    if (state.nodes.length === 0) {
      throw new AllTopologyNodesDownException("There are no nodes in the topology at all");
    }

    return new CurrentIndexAndNode(0, state.nodes[0]);
  }

  public getFastestNode(): CurrentIndexAndNode {
    const state = this._state;
    if (state.failures[state.fastest] === 0
      && state.nodes[state.fastest].serverRole === ServerNodeRole.MEMBER) {
      return new CurrentIndexAndNode(state.fastest, state.nodes[state.fastest]);
    }

    // if the fastest node has failures, we'll immediately schedule
    // another run of finding who the fastest node is, in the meantime
    // we'll just use the server preferred node or failover as usual

    this._switchToSpeedTestPhase();
    return this.getPreferredNode();
  }

  public restoreNodeIndex(nodeIndex: number): void {
    const state = this._state;
    if (state.currentNodeIndex < nodeIndex) {
      return; // nothing to do
    }

    state.failures[nodeIndex] = 0;
  }

  protected throwEmptyTopology(): void {
    throw new InvalidOperationException("Empty database topology, this shouldn't happen.");
  }

  private _switchToSpeedTestPhase(): void {
    const state = this._state;

    if (state.speedTestMode === 0) {
      state.speedTestMode = 1;
    } else {
      return;
    }

    state.fastestRecords.fill(0);
    state.speedTestMode++;
  }

  public inSpeedTestPhase(): boolean {
    return this._state.speedTestMode > 1;
  }

  public recordFastest(index: number, node: ServerNode): void {
    const state = this._state;
    const stateFastest = state.fastestRecords;

    // the following two checks are to verify that things didn't move
    // while we were computing the fastest node, we verify that the index
    // of the fastest node and the identity of the node didn't change during
    // our check
    if (index < 0 || index >= stateFastest.length) {
      return;
    }

    if (node !== state.nodes[index]) {
      return;
    }

    if (++stateFastest[index] >= 10) {
      this._selectFastest(state, index);
    }

    if (++state.speedTestMode <= state.nodes.length * 10) {
      return;
    }

    // too many concurrent speed tests are happening
    const maxIndex: number = NodeSelector._findMaxIndex(state);
    this._selectFastest(state, maxIndex);
  }

  private static _findMaxIndex(state: NodeSelectorState): number {
    const stateFastest = state.fastestRecords;
    let maxIndex = 0;
    let maxValue = 0;

    for (let i = 0; i < stateFastest.length; i++) {
      if (maxValue >= stateFastest[i]) {
        continue;
      }

      maxIndex = i;
      maxValue = stateFastest[i];
    }

    return maxIndex;
  }

  private _selectFastest(state: NodeSelectorState, index: number): void {
    state.fastest = index;
    state.speedTestMode = 0;

    const minuteMs = moment.duration(1, "m").asMilliseconds();
    if (this._updateFastestNodeTimer !== null) {
      this._updateFastestNodeTimer.change(minuteMs);
    } else {
      this._updateFastestNodeTimer = new Timer(() => {
        this._switchToSpeedTestPhase();
        return BluebirdPromise.resolve();
      }, minuteMs);
    }
  }

  public scheduleSpeedTest(): void {
    this._switchToSpeedTestPhase();
  }

  // // ====
  // private _lock: Lock;
  // private _currentNodeIndex: number = 0;
  // protected initialDatabase: string;
  // protected topology: Topology;

  // public get nodes(): ServerNode[] {
  //   this.assertTopology();

  //   return this.topology.nodes;
  // }

  // public get currentNodeIndex(): number {
  //   return this._currentNodeIndex;
  // }

  // public get topologyEtag(): number {
  //   return this.topology.etag;
  // }

  // public get currentNode(): ServerNode {
  //   return this.nodes[this._currentNodeIndex];
  // }

  // // constructor(requestExecutor: RequestExecutor, topology: Topology) {
  // //   const {TOPOLOGY_UPDATED, REQUEST_FAILED, NODE_STATUS_UPDATED} = RequestExecutor;

  // //   this._lock = Lock.make();
  // //   this.topology = topology;    

  // //   requestExecutor.on<ITopologyUpdateEvent>(TOPOLOGY_UPDATED, 
  // //     (data: ITopologyUpdateEvent): void => this.onTopologyUpdated(data)
  // //   );

  // //   requestExecutor.on<ServerNode>(REQUEST_FAILED, 
  // //     (data: ServerNode): void => this.onRequestFailed(data)
  // //   );

  // //   requestExecutor.on<ServerNode>(NODE_STATUS_UPDATED, 
  // //     (data: ServerNode): void => this.onNodeRestored(data)
  // //   );
  // // }

  // protected assignTopology(topology: Topology, forceUpdate: boolean): BluebirdPromise<void> {
  //   const oldTopology: Topology = this.topology;

  //   return this._lock.acquire((): any => {
  //     if (!forceUpdate) {
  //       this._currentNodeIndex = 0;
  //     }

  //     if (oldTopology === this.topology) {
  //       this.topology = topology;
  //       return true;
  //     }

  //     return false;
  //   })
  //   .catch((): boolean => false)
  //   .then((wasUpdated): BluebirdPromise.Thenable<void> => {
  //     if (!wasUpdated) {
  //       return this.assignTopology(topology, forceUpdate);
  //     }

  //     return BluebirdPromise.resolve();
  //   });
  // }

  // protected onTopologyUpdated(event: ITopologyUpdateEvent): void {
  //   let shouldUpdate: boolean = false;
  //   const forceUpdate: boolean = (true === event.forceUpdate);

  //   if (event.topologyJson) {
  //     const topology: Topology = Topology.fromJson(event.topologyJson);

  //     if (topology.nodes.length) {
  //       shouldUpdate = forceUpdate || (this.topology.etag < topology.etag);        
  //     }

  //     if (shouldUpdate) {
  //       this.assignTopology(topology, forceUpdate);
  //     }
  //   }

  //   event.wasUpdated = shouldUpdate;
  // }

  // protected onRequestFailed(failedNode: ServerNode): void {
  //   this.assertTopology();

  //   this._currentNodeIndex = ++this._currentNodeIndex % this.topology.nodes.length;
  // }

  // protected onNodeRestored(failedNode: ServerNode): void {
  //   const nodes: ServerNode[] = this.topology.nodes;

  //   if (nodes.includes(failedNode)) {
  //     const failedNodeIndex: number = nodes.indexOf(failedNode);

  //     if (this._currentNodeIndex > failedNodeIndex) {
  //       this._currentNodeIndex = failedNodeIndex;
  //     }
  //   }
  // }

  // protected assertTopology(): void | never {
  //   if (!this.topology || !this.topology.nodes || !this.topology.nodes.length) {
  //     throw new InvalidOperationException("Empty database topology, this shouldn't happen.");
  //   }
  // }
}
