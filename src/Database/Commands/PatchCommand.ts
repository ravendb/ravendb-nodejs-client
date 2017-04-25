import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RavenCommandResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {DocumentKey} from "../../Documents/IDocument";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {PatchRequest} from "../../Http/Request/PatchRequest";
import {TypeUtil} from "../../Utility/TypeUtil";

export class PatchCommand extends RavenCommand {
  protected key?: DocumentKey;
  protected patch: PatchRequest;
  protected etag?: number = null;
  protected patchIfMissing?: PatchRequest = null;
  protected skipPatchIfEtagMismatch: boolean = false;
  protected returnDebugInformation: boolean;
  protected path: string;

  constructor(key: DocumentKey, patch, etag?, patchIfMissing?: PatchRequest, skipPatchIfEtagMismatch: boolean = false, returnDebugInformation: boolean = false) {
    super('', RequestMethods.Patch);

    this.key = key;
    this.patch = patch;
    this.etag = etag;
    this.patchIfMissing = patchIfMissing;
    this.skipPatchIfEtagMismatch = skipPatchIfEtagMismatch;
    this.returnDebugInformation = returnDebugInformation;
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

  public setResponse(response: IResponse): RavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body as IResponseBody;

    if (response && StatusCodes.isOk(response.statusCode)) {
      return responseBody as RavenCommandResponse;
    }
  }
}