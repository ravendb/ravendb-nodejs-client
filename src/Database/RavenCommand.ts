import {ServerNode} from '../Http/ServerNode';
import {RequestMethod, RequestMethods} from '../Http/Request/RequestMethod';
import {IRavenCommandResponse} from "./IRavenCommandResponse";
import {IResponse} from "../Http/Response/IResponse";
import {IHeaders} from "../Http/IHeaders";
import {TypeUtil} from "../Utility/TypeUtil";
import * as _ from 'lodash';
import * as Request from 'request';
import * as RequestPromise from 'request-promise';

export type RavenCommandRequestOptions = RequestPromise.RequestPromiseOptions & Request.RequiredUriUrl;

export abstract class RavenCommand {
  protected method: RequestMethod = RequestMethods.Get;
  protected endPoint?: string;
  protected params?: Object;
  protected payload?: Object;
  protected headers: Object = {};
  protected avoidFailover: boolean = false;
  protected failedNodes: Set<ServerNode>;
  protected isReadRequest: boolean = false;
  protected authenticationRetries: number = 0;
  private readonly _ravenCommand: boolean = true;

  protected abstract createRequest(serverNode: ServerNode): void;

  constructor(endPoint: string, method: RequestMethod = RequestMethods.Get, params?: Object, payload?: Object, headers: IHeaders = {}, isReadRequest: boolean = false) {
    this.endPoint = endPoint;
    this.method = method;
    this.params = params;
    this.payload = payload;
    this.headers = headers;
    this.isReadRequest = isReadRequest;
    this.failedNodes = new Set<ServerNode>();
  }

  get ravenCommand(): boolean {
    return this._ravenCommand;
  }

  public isFailedWithNode(node: ServerNode): boolean {
    const nodes = this.failedNodes;

    return (nodes.size > 0) && nodes.has(node);
  }

  public toRequestOptions(): RavenCommandRequestOptions {
    let options: RavenCommandRequestOptions = {
      json: true,
      uri: this.endPoint,
      method: this.method,
      headers: this.headers,
      resolveWithFullResponse: true,
    };

    const params = this.params;
    const payload = this.payload;

    const check: (target?: Object) => boolean = (target: Object) => {
      return !TypeUtil.isNone(target) && !_.isEmpty(target);
    };

    check(params) && (options.qs = params);
    check(payload) && (options.body = payload);

    return options;
  }

  protected addParams(params: Object | string, value?: any): void {
    Object.assign(this.params, TypeUtil.isObject(params)
      ? params as Object : {[params as string]: value});
  }

  protected setResponse(response: IResponse): IRavenCommandResponse | null | void {
    return null;
  }
}