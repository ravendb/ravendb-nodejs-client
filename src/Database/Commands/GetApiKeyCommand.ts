import {RavenCommand} from "../RavenCommand";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ServerNode} from "../../Http/ServerNode";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RavenCommandResponse} from "../RavenCommandResponse";
import {StringUtil} from "../../Utility/StringUtil";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";

export class GetApiKeyCommand extends RavenCommand {
  protected name: string;

  constructor(name: string) {
    super('', RequestMethods.Get);

    if (!name) {
      throw new InvalidOperationException('Api key name isn\'t set');
    }

    this.name = name;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {name: this.name};
    this.endPoint = StringUtil.format('{url}/admin/api-keys', serverNode);
  }

  public setResponse(response: IResponse): RavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body;

    if (responseBody && responseBody.Results) {
      return responseBody.Results as RavenCommandResponse;
    }

    throw new ErrorResponseException('Invalid server response');
  }
}