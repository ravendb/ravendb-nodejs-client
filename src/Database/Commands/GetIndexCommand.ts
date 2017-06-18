import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";

export class GetIndexCommand extends RavenCommand {
  protected indexName?: string;
  protected forceReadFromMaster: boolean = false;

  constructor(indexName: string, forceReadFromMaster: boolean = false) {
    super('', RequestMethods.Get, null, null, {});
    this.indexName = indexName;
    this.forceReadFromMaster = forceReadFromMaster;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {};
    this.endPoint = StringUtil.format('{url}/databases/{database}/indexes', serverNode);
    this.indexName && this.addParams('name', this.indexName);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (!response.body) {
      return;
    }

    return <IRavenResponse[]>result.Results;
  }
}