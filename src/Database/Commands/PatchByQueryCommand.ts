import {QueryBasedCommand} from "./QueryBasedCommand";
import {IndexQuery} from "../Indexes/IndexQuery";
import {PatchRequest} from "../../Http/Request/PatchRequest";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {IResponse} from "../../Http/Response/IResponse";
import {IRavenResponse} from "../RavenCommandResponse";
import {StatusCodes} from "../../Http/Response/StatusCode";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {ServerNode} from "../../Http/ServerNode";

export class PatchByQueryCommand extends QueryBasedCommand {
  protected patch?: PatchRequest = null;

  constructor(queryToUpdate: IndexQuery, patch?: PatchRequest, options?: QueryOperationOptions) {
    super(RequestMethods.Patch, queryToUpdate, options);
    this.patch = patch;
  }

  public createRequest(serverNode: ServerNode): void {
    if (!(this.patch instanceof PatchRequest)) {
      throw new InvalidOperationException('Patch must me instanceof PatchRequest class');
    }

    this.payload = {
      "Patch": this.patch.toJson(),
      "Query": this.query.toJson
    };

    this.endPoint = StringUtil.format('{url}/databases/{database}', serverNode);
    super.createRequest(serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const result: IRavenResponse = <IRavenResponse>super.setResponse(response);

    if (![StatusCodes.Ok, StatusCodes.Accepted].includes(response.statusCode)) {
      throw new ErrorResponseException('Invalid response from server');
    }

    return result;
  }

}
