import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {StringUtil} from "../../Utility/StringUtil";
import {IndexQuery} from "../Indexes/IndexQuery";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {IResponse} from "../../Http/Response/IResponse";
import {IRavenResponse} from "../RavenCommandResponse";
import {QueryBasedCommand} from "./QueryBasedCommand";
import {IndexDoesNotExistException} from "../DatabaseExceptions";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {IJsonable} from "../../Json/Contracts";

export class DeleteByQueryCommand extends QueryBasedCommand  implements IJsonable {
  public toJson;
  constructor(query: IndexQuery, options?: QueryOperationOptions) {
    super(RequestMethods.Delete, query, options);
  }

  public createRequest(serverNode: ServerNode): void {
    this.endPoint = StringUtil.format('{url}/databases/{database}', serverNode, this.params);

    super.createRequest(serverNode);

    this.payload = this.query.toJson();

  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (!response.body && StatusCodes.isError(response.statusCode)) {
      throw new IndexDoesNotExistException('Could not find index');
    }

    return result;
  }

}
