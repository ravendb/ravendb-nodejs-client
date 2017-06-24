import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {IRavenResponse} from "../RavenCommandResponse";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {IResponse} from "../../Http/Response/IResponse";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";
import {IndexDoesNotExistException} from "../DatabaseExceptions";

export class GetIndexesCommand extends RavenCommand {
  protected start?: number;
  protected pageSize?: number;

  constructor(start: number = 0, pageSize: number = 10) {
    super('', RequestMethods.Get, null, null, {});
    this.start = start;
    this.pageSize = pageSize
  }

  public createRequest(serverNode: ServerNode): void {
    this.endPoint = StringUtil.format('{url}/databases/{database}/indexes', serverNode);  
    this.params = { start: this.start, pageSize: this.pageSize };
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (StatusCodes.isNotFound(response.statusCode)) {
      throw new IndexDoesNotExistException('Can\'t find requested index(es)');
    }

    if (!response.body) {
      return;
    }

    return <IRavenResponse[]>result.Results;
  }
}