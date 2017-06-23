import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";

export class GetTopologyCommand extends RavenCommand {
  constructor() {
    super('', RequestMethods.Get, null, null, {});
    this._avoidFailover = true;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {name: serverNode.database};
    this.endPoint = StringUtil.format('{url}/topology', serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (response.body) {
      return result;
    }
  }
}