import {RavenCommand} from "../RavenCommand";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ServerNode} from "../../Http/ServerNode";
import {StringUtil} from "../../Utility/StringUtil";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RavenCommandResponse} from "../RavenCommandResponse";
import {StatusCodes} from "../../Http/Response/StatusCode";

export class GetStatisticsCommand extends RavenCommand {
  constructor() {
    super('', RequestMethods.Get);
  }

  public createRequest(serverNode: ServerNode): void {
    this.endPoint = StringUtil.format('{url}/databases/{database}/stats', serverNode);
  }

  public setResponse(response: IResponse): RavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body;

    if (responseBody && StatusCodes.isOk(response.statusCode)) {
      return responseBody as RavenCommandResponse;
    }

    return null;
  }
}