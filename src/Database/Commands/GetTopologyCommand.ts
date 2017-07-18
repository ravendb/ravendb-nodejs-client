import * as _ from 'lodash';
import {IRavenObject} from '../IRavenObject';
import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {StringUtil} from "../../Utility/StringUtil";

export class GetTopologyCommand extends RavenCommand {
  protected forceUrl?: string;

  constructor(forceUrl?: string) {
    super('', RequestMethods.Get);
    this.forceUrl = forceUrl;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {name: serverNode.database};
    this.forceUrl && this.addParams('url', this.forceUrl);
    this.endPoint = StringUtil.format('{url}/topology', serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (response.body && StatusCodes.isOk(response.statusCode)) {
      return result;
    }
  }
}
