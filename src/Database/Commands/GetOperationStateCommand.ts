import {RavenCommand} from "../RavenCommand";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ServerNode} from "../../Http/ServerNode";
import {IResponse} from "../../Http/Response/IResponse";
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
    this.endPoint = StringUtil.format('{url}/databases/{database}/operations/state', serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (response.body) {
      return result;
    }

    throw new ErrorResponseException('Invalid server response');
  }
}