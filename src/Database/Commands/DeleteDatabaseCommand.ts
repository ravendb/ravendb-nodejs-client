import * as _ from 'lodash';
import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";

export class DeleteDatabaseCommand extends RavenCommand {
  protected databaseId?: string;
  protected hardDelete: boolean = false;
  protected fromNode: string = null;
  protected timeToWaitForConfirmation: number = null;

  constructor(databaseId: string, hardDelete: boolean = false, fromNode?: ServerNode | string, timeToWaitForConfirmation?: number) {
    super('', RequestMethods.Delete);
    
    this.fromNode = <string>fromNode;
    this.databaseId = databaseId;
    this.hardDelete = hardDelete;
    this.timeToWaitForConfirmation = timeToWaitForConfirmation;

    if (fromNode instanceof ServerNode) {
      this.fromNode = (<ServerNode>fromNode).clusterTag;
    }
  }

  public createRequest(serverNode: ServerNode): void {
    let dbName: string = this.databaseId.replace('Raven/Databases/', '');

    this.payload = {
      DatabaseNames: [dbName],
      HardDelete: this.hardDelete,
      TimeToWaitForConfirmation: this.timeToWaitForConfirmation
    };
    
    if (this.fromNode) {
      _.assign(this.payload, {
        FromNodes: [this.fromNode]
      });
    }
    
    this.endPoint = StringUtil.format('{url}/admin/databases', serverNode);
  }
}
