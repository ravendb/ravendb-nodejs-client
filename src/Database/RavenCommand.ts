import {ServerNode} from '../Http/ServerNode';
import {RequestMethod, RequestMethods} from '../Http/Request/RequestMethod';
import {IRavenResponse} from "./RavenCommandResponse";
import {IResponse} from "../Http/Response/IResponse";
import {IHeaders} from "../Http/IHeaders";
import {TypeUtil} from "../Utility/TypeUtil";
import {ExceptionThrower} from "../Utility/ExceptionThrower";
import * as _ from 'lodash';
import * as Request from 'request';
import * as RequestPromise from 'request-promise';

export type RavenCommandRequestOptions = RequestPromise.RequestPromiseOptions & Request.RequiredUriUrl;

export abstract class RavenCommand {
  protected method: RequestMethod = RequestMethods.Get;
  protected endPoint?: string;
  protected params?: object;
  protected payload?: object;
  protected headers: object = {};
  protected failedNodes: Set<ServerNode>;
  protected _avoidFailover: boolean = false;
  private readonly _ravenCommand: boolean = true;
  private _isReadRequest: boolean = false;
  private _authenticationRetries: number = 0;

  public abstract createRequest(serverNode: ServerNode): void;

  constructor(endPoint: string, method: RequestMethod = RequestMethods.Get, params?: object, payload?: object, headers: IHeaders = {}, isReadRequest: boolean = false) {
    this.endPoint = endPoint;
    this.method = method;
    this.params = params;
    this.payload = payload;
    this.headers = headers;
    this._isReadRequest = isReadRequest;
    this.failedNodes = new Set<ServerNode>();
  }

  public get ravenCommand(): boolean {
    return this._ravenCommand;
  }

  public get isReadRequest(): boolean {
    return this._isReadRequest;
  }

  public get avoidFailover(): boolean {
    return this._avoidFailover;
  }

  public get authenticationRetries(): number {
    return this._authenticationRetries;
  }

  public addFailedNode(node: ServerNode): void {
    this.failedNodes.add(node);
  }

  public isFailedWithNode(node: ServerNode): boolean {
    const nodes = this.failedNodes;

    return (nodes.size > 0) && nodes.has(node);
  }

  public increaseAuthenticationRetries(): void {
    this._authenticationRetries++;
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

    const check: (target?: object) => boolean = (target: object) => {
      return !TypeUtil.isNone(target) && !_.isEmpty(target);
    };

    check(params) && (options.qs = params);
    check(payload) && (options.body = payload);

    return options;
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    ExceptionThrower.throwFrom(response);    

    if (response.body) {
      return <IRavenResponse>response.body;
    }
  }

  protected addParams(params: object | string, value?: any): void {
    Object.assign(this.params, TypeUtil.isObject(params)
      ? params : {[params as string]: value});
  }
}