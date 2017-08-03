import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import {log} from "util";

export class DeleteDatabaseCommand extends RavenCommand {
  protected databaseId?: string;
  protected hardDelete: boolean = false;
  protected fromNode: ServerNode = null;

  constructor(databaseId: string, hardDelete: boolean = false, fromNode?: ServerNode ) {
    super('', RequestMethods.Delete);
    this.fromNode = fromNode;
    this.databaseId = databaseId;
    this.hardDelete = hardDelete;
  }

  public createRequest(serverNode: ServerNode): void {
    let dbName: string = this.databaseId.replace('Raven/Databases/', '');
    this.params = {name: dbName};
    this.hardDelete && this.addParams({'hard-delete': 'true'});
    this.fromNode && this.addParams({'from-node': this.fromNode.clusterTag});
    this.endPoint = StringUtil.format('{url}/admin/databases', serverNode);
  }
}
