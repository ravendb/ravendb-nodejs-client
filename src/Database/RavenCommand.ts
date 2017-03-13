import {ServerNode} from '../Http/ServerNode';
import {RequestMethod, RequestMethods} from '../Http/RequestsExecutor';

export abstract class RavenCommand {
  protected method: RequestMethod = RequestMethods.Get;
  private _endPoint?: string;
  protected params?: Object;
  protected payload?: Object;
  protected headers: Object = {};
  protected adminCommand: boolean = false;
  private readonly _ravenCommand: boolean = true;

  construct(endPoint?: string, method: RequestMethod = RequestMethods.Get, params?: Object, payload?: Object, headers: Object = {}, adminCommand: boolean = false) {
    this._endPoint = endPoint;
    this.method = method;
    this.params = params;
    this.payload = payload;
    this.headers = headers;
    this.adminCommand = adminCommand;
  }

  get ravenCommand(): boolean {
    return this._ravenCommand;
  }

  protected abstract createRequest(serverNode: ServerNode): void;
  protected abstract setResponse(response: Object): void;
}