import * as _ from 'lodash';
import {IRavenObject} from '../IRavenObject';
import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {GetTopologyCommand} from "./GetTopologyCommand";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {StringUtil} from "../../Utility/StringUtil";

export class GetClusterTopologyCommand extends GetTopologyCommand {
  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);
    this.removeParams('name');
    this.endPoint = StringUtil.format('{url}/cluster/topology', serverNode);
  }
}
