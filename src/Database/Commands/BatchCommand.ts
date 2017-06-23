import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {RavenCommandData} from "../RavenCommandData";

export class BatchCommand extends RavenCommand {
  protected commandsArray?: RavenCommandData[];

  constructor(commandsArray: RavenCommandData[]) {
    super('', RequestMethods.Post);
    this.commandsArray = commandsArray;
  }

  public createRequest(serverNode: ServerNode): void {
    const commands: RavenCommandData[] = this.commandsArray;

    if (!commands.every((data: RavenCommandData): boolean => !!(data && data.command))) {
      throw new InvalidOperationException('Not a valid command');
    }

    this.endPoint = StringUtil.format('{url}/databases/{database}/bulk_docs', serverNode);
    this.payload = {"Commands": this.commandsArray.map((data: RavenCommandData): object => data.toJson())};
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);    

    if (!response.body) {
      throw new InvalidOperationException('Invalid response body received');
    }

    return result.Results as IRavenResponse[];
  }
}
