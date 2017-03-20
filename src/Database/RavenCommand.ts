import {ServerNode} from '../Http/ServerNode';
import {RequestMethod, RequestMethods} from '../Http/Request/RequestMethod';
import {IRavenCommandResponse} from "./IRavenCommandResponse";
import {IResponse} from "../Http/IResponse";

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

  constructor(endPoint: string, method: RequestMethod = RequestMethods.Get, params?: Object, payload?: Object, headers: Object = {}, isReadRequest: boolean = false) {
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

  protected abstract createRequest(serverNode: ServerNode): void;
  protected abstract setResponse(response: IResponse): IRavenCommandResponse | null | void;
}