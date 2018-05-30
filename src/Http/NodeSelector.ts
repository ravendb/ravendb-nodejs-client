import * as _ from "lodash";
import * as moment from "moment";
import { ServerNode} from "../Http/ServerNode";
import CurrentIndexAndNode from "../Http/CurrentIndexAndNode";
import { Topology } from "./Topology";
import { Timer } from "../Primitives/Timer";
import { throwError } from "../Exceptions";

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
        && state.nodes[i].serverRole === "Member") {
        return new CurrentIndexAndNode(i, state.nodes[i]);
      }
    }

    for (let i = 0; i < index; i++) {
      if (state.failures[i] === 0
        && state.nodes[i].serverRole === "Member") {
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
      throwError("AllTopologyNodesDownException", "There are no nodes in the topology at all.");
    }

    return new CurrentIndexAndNode(0, state.nodes[0]);
  }

  public getFastestNode(): CurrentIndexAndNode {
    const state = this._state;
    if (state.failures[state.fastest] === 0
      && state.nodes[state.fastest].serverRole === "Member") {
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

  protected _throwEmptyTopology(): void {
    throwError("InvalidOperationException", "Empty database topology, this shouldn't happen.");
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
        return Promise.resolve();
      }, minuteMs);
    }
  }

  public scheduleSpeedTest(): void {
    this._switchToSpeedTestPhase();
  }
}
