import {ServerNode} from "./ServerNode";
import {IDisposable} from "../Types/Contracts";

export class NodeStatus implements IDisposable {
  private readonly maxTimerPeriod = 60 * 5 * 1000;
  private readonly timerPeriodStep = .1 * 1000;
  private _nodeIndex: number;
  private _node: ServerNode;
  private _timerPeriod: number = 0;
  private _timer?: NodeJS.Timer = null;
  private _onUpdate: (nodeStatus: NodeStatus) => void;

  public get nextTimerPeriod(): number {
    const maxPeriod: number = this.maxTimerPeriod;

    if (this._timerPeriod < maxPeriod) {
      this._timerPeriod += this.timerPeriodStep;
    }

    return Math.min(maxPeriod, this._timerPeriod);
  }

  public get nodeIndex(): number {
    return this._nodeIndex;
  }

  public get node(): ServerNode {
    return this._node;
  }

  constructor(nodeIndex: number, node: ServerNode, onUpdate: typeof NodeStatus.prototype._onUpdate) {
    this._onUpdate = onUpdate;
    this._nodeIndex = nodeIndex;
    this._node = node;
  }

  public startUpdate(): void {
    this.dispose();
    this._timer = setTimeout(
      () => {
        this._onUpdate(this);
        this._timer = null;
      }, 
      this.nextTimerPeriod
    );
  }

  public retryUpdate(): void {
    this.startUpdate();
  }

  public dispose(): void {
    if (this._timer) {
      clearTimeout(this._timer);
    }
  }
}
