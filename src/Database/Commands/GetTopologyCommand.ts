import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenCommandResponse} from "../IRavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";
import {StatusCodes, StatusCode} from "../../Http/Response/StatusCode";
import {ErrorResponseException} from "../DatabaseExceptions";

export class GetTopologyCommand extends RavenCommand {
  constructor() {
    super('', RequestMethods.Get, null, null, {}, true);
    this._avoidFailover = true;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {url: serverNode.url};
    this.endPoint = StringUtil.format('{url}/databases/{database}/topology', serverNode);
  }

  public setResponse(response: IResponse): IRavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body;
    const status: StatusCode = response.statusCode;

    if (responseBody && StatusCodes.isOk(status)) {
      return responseBody as IRavenCommandResponse;
    }

    if (StatusCodes.isBadRequest(status)) {
      throw new ErrorResponseException(responseBody.Error);
    }

    return null;
  }
}