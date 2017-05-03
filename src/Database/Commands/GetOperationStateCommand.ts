import {RavenCommand} from "../RavenCommand";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ServerNode} from "../../Http/ServerNode";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {IRavenResponse} from "../RavenCommandResponse";
import {StringUtil} from "../../Utility/StringUtil";
import {ErrorResponseException} from "../DatabaseExceptions";

export class GetOperationStateCommand extends RavenCommand {
  protected id: string;

  constructor(id: string) {
    super('', RequestMethods.Get);
    this.id = id;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {id: this.id};
    this.endPoint = StringUtil.format('{url}/databases/{databases}/operations/state', serverNode);
  }


  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | null | void {
    const responseBody: IResponseBody = response.body;

    if (responseBody) {
      return responseBody;
    }

    throw new ErrorResponseException('Invalid server response');
  }
}