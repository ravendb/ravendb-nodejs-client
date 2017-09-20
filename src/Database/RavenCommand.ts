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
  private _lastResponse: IResponse;

  public abstract createRequest(serverNode: ServerNode): void;

  public get serverResponse(): IResponse {
    return this._lastResponse;
  }

  constructor(endPoint: string, method: RequestMethod = RequestMethods.Get, params?: object, payload?: object, headers: IHeaders = {}) {
    this.endPoint = endPoint;
    this.method = method;
    this.params = params;
    this.payload = payload;
    this.headers = headers;
    this.failedNodes = new Set<ServerNode>();
  }

  public get wasFailed(): boolean {
    const nodes = this.failedNodes;

    return nodes.size > 0;
  }

  public addFailedNode(node: ServerNode): void {
    this.failedNodes.add(node);
  }

  public wasFailedWithNode(node: ServerNode): boolean {
    const nodes = this.failedNodes;

    return this.wasFailed && nodes.has(node);
  }

  public toRequestOptions(): RavenCommandRequestOptions {
    const params = this.params;
    const payload = this.payload;

    const check: (target?: object) => boolean = (target: object) => {
      return !TypeUtil.isNone(target) && !_.isEmpty(target);
    };

    let options: RavenCommandRequestOptions = {
      json: true,
      uri: this.endPoint,
      method: this.method,
      headers: this.headers,
      resolveWithFullResponse: true,
      qsStringifyOptions: {
        arrayFormat: 'repeat',
        strictNullHandling: true
      }
    };

    check(params) && (options.qs = params);
    check(payload) && (options.body = payload);

    return options;
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    ExceptionThrower.throwFrom(this._lastResponse = response);    

    if (response.body) {
      return <IRavenResponse>response.body;
    }
  }

  protected addParams(params: object | string, value?: any): void {
    Object.assign(this.params, TypeUtil.isObject(params)
      ? params : {[params as string]: value});
  }

  protected removeParams(params: string[] | string, ...otherParams: string[]) {
    const paramsToRemove = Array.isArray(params) 
      ? params : [params as string].concat(otherParams || []);

    paramsToRemove.forEach((param: string) => delete this.params[param]);  
  }
}