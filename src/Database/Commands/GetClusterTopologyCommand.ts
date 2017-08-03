import {ServerNode} from '../../Http/ServerNode';
import {GetTopologyCommand} from "./GetTopologyCommand";
import {StringUtil} from "../../Utility/StringUtil";

export class GetClusterTopologyCommand extends GetTopologyCommand {
  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);
    this.removeParams('name');
    this.endPoint = StringUtil.format('{url}/cluster/topology', serverNode);
  }
}
