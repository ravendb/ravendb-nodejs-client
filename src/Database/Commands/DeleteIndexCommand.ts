import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";

export class DeleteIndexCommand extends RavenCommand {
  protected indexName?: string;

  constructor(indexName: string) {
    super('', RequestMethods.Delete);
    this.indexName = indexName;
  }

  public createRequest(serverNode: ServerNode): void {
    if (!this.indexName) {
      throw new InvalidOperationException('Null or empty indexName is invalid')
    }

    this.params = {name: this.indexName};
    this.endPoint = StringUtil.format('{url}/databases/{database}/indexes', serverNode);
  }
}
