import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {TypeUtil} from "../../Utility/TypeUtil";

export class DeleteDocumentCommand extends RavenCommand {
  protected id?: string;
  protected etag?: number;

  constructor(id: string, etag?: number) {
    super('', RequestMethods.Delete);

    this.id = id;
    this.etag = etag;
  }

  public createRequest(serverNode: ServerNode): void {
    if (!this.id) {
      throw new InvalidOperationException('Null Id is not valid');
    }

    if (!TypeUtil.isString(this.id)) {
      throw new InvalidOperationException('Id must be a string');
    }

    if (this.etag) {
      this.headers = {'If-Match': StringUtil.format('"{0}"', this.etag)};
    }

    this.params = {id: this.id};
    this.endPoint = StringUtil.format('{url}/databases/{database}/docs', serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    <IRavenResponse>super.setResponse(response);

    this.checkResponse(response);
  }

  protected checkResponse(response: IResponse): void {
    if (!StatusCodes.isNoContent(response.statusCode)) {
      throw new InvalidOperationException(StringUtil.format('Could not delete document {0}', this.id));
    }
  }
}