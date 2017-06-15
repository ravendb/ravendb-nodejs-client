import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {PatchRequest} from "../../Http/Request/PatchRequest";
import {TypeUtil} from "../../Utility/TypeUtil";

export interface IPatchCommandOptions {
  etag?: number, 
  patchIfMissing?: PatchRequest, 
  skipPatchIfEtagMismatch?: boolean,
  returnDebugInformation?: boolean
}

export class PatchCommand extends RavenCommand {
  protected key?: string;
  protected patch: PatchRequest;
  protected etag?: number = null;
  protected patchIfMissing?: PatchRequest = null;
  protected skipPatchIfEtagMismatch: boolean = false;
  protected returnDebugInformation: boolean;
  protected path: string;

  constructor(key: string, patch: PatchRequest, options?: IPatchCommandOptions) {
    super('', RequestMethods.Patch);

    const opts: IPatchCommandOptions = options || {};

    this.key = key;
    this.patch = patch;
    this.etag = opts.etag;
    this.patchIfMissing = opts.patchIfMissing;
    this.skipPatchIfEtagMismatch = opts.skipPatchIfEtagMismatch || false;
    this.returnDebugInformation = opts.returnDebugInformation || false;
  }

  public createRequest(serverNode: ServerNode): void {
    if (TypeUtil.isNone(this.key)) {
      throw new InvalidOperationException('None key is invalid');
    }

    if (TypeUtil.isNone(this.patch)) {
      throw new InvalidOperationException('None patch is invalid');
    }

    if (this.patchIfMissing && (!this.patchIfMissing || !this.patchIfMissing.script)) {
      throw new InvalidOperationException('None or Empty script is invalid');
    }

    this.params = {id: this.key};
    this.endPoint = StringUtil.format('{url}/databases/{database}/docs', serverNode);
    this.skipPatchIfEtagMismatch && this.addParams('skipPatchIfEtagMismatch', 'true');
    this.returnDebugInformation && this.addParams('debug', 'true');
    TypeUtil.isNone(this.etag) || (this.headers = {"If-Match": StringUtil.format('"{etag}"', this)});

    this.payload = {
      "Patch": this.patch.toJson(),
      "PatchIfMissing": this.patchIfMissing ? this.patchIfMissing.toJson() : null
    };
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const responseBody: IResponseBody = response.body;
    let message: string = `Could not patch document ${this.key}`;

    if (response) {
      if ([StatusCodes.NotModified, StatusCodes.Ok].includes(response.statusCode)) {
        return responseBody || null;
      }

      if (responseBody && responseBody.Error) {
        message = responseBody.Error;
      }  
    } 

    throw new InvalidOperationException(message);
  }
}