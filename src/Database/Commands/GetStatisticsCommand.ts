import {RavenCommand} from "../RavenCommand";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ServerNode} from "../../Http/ServerNode";
import {StringUtil} from "../../Utility/StringUtil";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {IRavenResponse} from "../RavenCommandResponse";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {ErrorResponseException} from "../DatabaseExceptions";

export class GetStatisticsCommand extends RavenCommand {
  constructor() {
    super('', RequestMethods.Get);
  }

  public createRequest(serverNode: ServerNode): void {
    this.endPoint = StringUtil.format('{url}/databases/{database}/stats', serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (response.body) {
      return result;
    }

    throw new ErrorResponseException('Invalid server response');
  }
}