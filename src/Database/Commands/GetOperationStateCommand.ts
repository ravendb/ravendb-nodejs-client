import {RavenCommand} from "../RavenCommand";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ServerNode} from "../../Http/ServerNode";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {IRavenCommandResponse} from "../IRavenCommandResponse";
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


  public setResponse(response: IResponse): IRavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body;

    if (responseBody) {
      return responseBody as IRavenCommandResponse;
    }

    throw new ErrorResponseException('Invalid server response');
  }
}