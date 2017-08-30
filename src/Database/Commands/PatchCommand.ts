import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {PatchRequest, IPatchRequestOptions} from "../../Http/Request/PatchRequest";
import {TypeUtil} from "../../Utility/TypeUtil";

export class PatchCommand extends RavenCommand {
  protected id?: string;
  protected patch: PatchRequest;
  protected changeVector?: string = null;
  protected patchIfMissing?: PatchRequest = null;
  protected skipPatchIfChangeVectorMismatch: boolean = false;
  protected returnDebugInformation: boolean;
  protected path: string;

  constructor(id: string, patch: PatchRequest, options?: IPatchRequestOptions) {
    super('', RequestMethods.Patch);

    const opts: IPatchRequestOptions = options || {};

    this.id = id;
    this.patch = patch;
    this.changeVector = opts.changeVector;
    this.patchIfMissing = opts.patchIfMissing;
    this.skipPatchIfChangeVectorMismatch = opts.skipPatchIfChangeVectorMismatch || false;
    this.returnDebugInformation = opts.returnDebugInformation || false;
  }

  public createRequest(serverNode: ServerNode): void {
    if (TypeUtil.isNone(this.id)) {
      throw new InvalidOperationException('Empty ID is invalid');
    }

    if (TypeUtil.isNone(this.patch)) {
      throw new InvalidOperationException('Empty patch is invalid');
    }

    if (this.patchIfMissing && (!this.patchIfMissing || !this.patchIfMissing.script)) {
      throw new InvalidOperationException('Empty script is invalid');
    }

    this.params = {id: this.id};
    this.endPoint = StringUtil.format('{url}/databases/{database}/docs', serverNode);
    this.skipPatchIfChangeVectorMismatch && this.addParams('skipPatchIfChangeVectorMismatch', 'true');
    this.returnDebugInformation && this.addParams('debug', 'true');
    TypeUtil.isNone(this.changeVector) || (this.headers = {"If-Match": StringUtil.format('"{change-vector}"', this)});

    this.payload = {
      "Patch": this.patch.toJson(),
      "PatchIfMissing": this.patchIfMissing ? this.patchIfMissing.toJson() : null
    };
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (![StatusCodes.NotModified, StatusCodes.Ok].includes(response.statusCode)) {
      throw new InvalidOperationException(StringUtil.format('Could not patch document {0}', this.id));
    }

    if (response.body) {
      return result;
    }
  }
}