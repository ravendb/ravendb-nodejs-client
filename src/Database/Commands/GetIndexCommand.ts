import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {RavenCommandResponse} from "../RavenCommandResponse";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";

export class GetIndexCommand extends RavenCommand {
  protected indexName?: string;
  protected forceReadFromMaster: boolean = false;

  constructor(indexName: string, forceReadFromMaster: boolean = false) {
    super('', RequestMethods.Get, null, null, {}, true);
    this.indexName = indexName;
    this.forceReadFromMaster = forceReadFromMaster;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {};
    this.endPoint = StringUtil.format('{url}/databases/{database}/indexes', serverNode);
    this.indexName && this.addParams('name', this.indexName);
  }

  public setResponse(response: IResponse): RavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body as IResponseBody;

    if (!responseBody) {
      return null
    }

    return responseBody.Results as RavenCommandResponse;
  }
}