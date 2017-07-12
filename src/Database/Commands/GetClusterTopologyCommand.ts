import {ServerNode} from '../../Http/ServerNode';
import {StringUtil} from "../../Utility/StringUtil";
import {GetTopologyCommand} from "./GetTopologyCommand";

export class GetClusterTopologyCommand extends GetTopologyCommand {
  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);
    this.removeParams('name');
    this.endPoint = StringUtil.format('{url}/admin/cluster/topology', serverNode);
  }
}
