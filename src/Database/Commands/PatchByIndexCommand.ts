import {IndexQueryBasedCommand} from "./IndexQueryBasedCommand";
import {IndexQuery} from "../Indexes/IndexQuery";
import {PatchRequest} from "../../Http/Request/PatchRequest";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {RavenCommandResponse} from "../RavenCommandResponse";
import {StatusCode, StatusCodes} from "../../Http/Response/StatusCode";
import {ErrorResponseException, InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {ServerNode} from "../../Http/ServerNode";

export class PatchByIndexCommand extends IndexQueryBasedCommand {
  protected patch?: PatchRequest = null;

  constructor(indexName: string, queryToUpdate: IndexQuery, patch?: PatchRequest, options?: QueryOperationOptions) {
    super(RequestMethods.Patch, indexName, queryToUpdate, options);
    this.patch = patch;
  }

  public createRequest(serverNode: ServerNode): void {
    if (!(this.patch instanceof PatchRequest)) {
      throw new InvalidOperationException('Patch must me instanceof PatchRequest class');
    }

    this.payload = this.patch.toJson();
    this.endPoint = StringUtil.format('{url}/databases/{database}', serverNode,this.params);
    super.createRequest(serverNode);
  }

  public setResponse(response: IResponse): RavenCommandResponse | null | void {
    const responseBody: IResponseBody = response.body as IResponseBody;
    const status: StatusCode = response.statusCode;

    if(!responseBody) {
      throw new ErrorResponseException(StringUtil.format('Could not find index {0}', this.indexName));
    }

    if (![StatusCodes.Ok, StatusCodes.Accepted].includes(status)) {
      throw new ErrorResponseException('Invalid response from server');
    }

    return responseBody as RavenCommandResponse;
  }
}
