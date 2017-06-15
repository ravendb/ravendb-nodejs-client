import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException, DocumentDoesNotExistsException, ErrorResponseException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {TypeUtil} from "../../Utility/TypeUtil";

export class DeleteDocumentCommand extends RavenCommand {
  protected key?: string;
  protected etag?: number;

  constructor(key: string, etag?: number) {
    super('', RequestMethods.Delete);

    this.key = key;
    this.etag = etag;
  }

  public createRequest(serverNode: ServerNode): void {
    if (!this.key) {
      throw new InvalidOperationException('Null Key is not valid');
    }

    if (!TypeUtil.isString(this.key)) {
      throw new InvalidOperationException('Key must be a string');
    }

    if (this.etag) {
      this.headers = {'If-Match': StringUtil.format('"{0}"', this.etag)};
    }

    this.params = {id: this.key};
    this.endPoint = StringUtil.format('{url}/databases/{database}/docs', serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const responseBody: IResponseBody = response.body as IResponseBody;
    let message: string = `Could not delete document ${this.key}`;

    if (!StatusCodes.isNoContent(response.statusCode)) {
      if (responseBody && responseBody.Error) {
        message = responseBody.Error;
      }

      throw new ErrorResponseException(message);
    }
  }
}