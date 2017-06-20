import * as _ from 'lodash';
import {ServerNode} from './ServerNode';

export class Topology {
  private _sla?: number = null;
  private _etag: number = 0;
  private _nodes?: ServerNode[] = null;

  constructor(etag: number = 0, nodes: ServerNode[] = null, sla: number = null) {
    this._etag = etag;
    this._nodes = nodes || [];
    this._sla = sla || .1;
  }

  public get nodes(): ServerNode[] {
    return this._nodes;
  }

  public get etag(): number {
    return this._etag;
  }

  public get sla(): number {
    return this._sla;
  }
}
