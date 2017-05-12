import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {RavenCommandData} from "../RavenCommandData";

export class BatchCommand extends RavenCommand {
  protected commandsArray?: RavenCommandData[];

  constructor(commandsArray: RavenCommandData[]) {
    super('', RequestMethods.Post);
    this.commandsArray = commandsArray;
  }

  public createRequest(serverNode: ServerNode): void {
    this.endPoint = StringUtil.format('{url}/databases/{database}/bulk_docs', serverNode);

    this.payload = this.commandsArray.map((data: RavenCommandData): Object => {
      if (!data.command) {
        throw new InvalidOperationException('Not a valid command');
      }

      return data.toJson();
    });
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const body: IResponseBody = response.body;

    if (!body) {
      throw new InvalidOperationException('Invalid response body received');
    }

    if (body.Error) {
      throw new ErrorResponseException(body.Error);
    }

    return body.Results;
  }
}
