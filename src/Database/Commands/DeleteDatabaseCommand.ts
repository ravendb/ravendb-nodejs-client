import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";

export class DeleteDatabaseCommand extends RavenCommand {
  protected databaseId?: string;
  protected hardDelete: boolean = false;

  constructor(databaseId: string, hardDelete: boolean = false) {
    super('', RequestMethods.Delete);

    this.databaseId = databaseId;
    this.hardDelete = hardDelete;
  }

  public createRequest(serverNode: ServerNode): void {
    let dbName: string = this.databaseId.replace('Raven/Databases/', '');

    this.params = {name: dbName};
    this.hardDelete && this.addParams({'hard-delete': 'true'});
    this.endPoint = StringUtil.format('{url}/admin/databases', serverNode);
  }
}
