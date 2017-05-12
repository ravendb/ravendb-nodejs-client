import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ErrorResponseException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {IndexQuery} from "../Indexes/IndexQuery";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {IResponse, IResponseBody} from "../../Http/Response/IResponse";
import {IRavenResponse} from "../RavenCommandResponse";
import {StatusCode, StatusCodes} from "../../Http/Response/StatusCode";
import {IndexQueryBasedCommand} from "./IndexQueryBasedCommand";

export class DeleteByIndexCommand extends IndexQueryBasedCommand {
  constructor(indexName: string, query: IndexQuery, options?: QueryOperationOptions) {
    super(RequestMethods.Delete, indexName, query, options);
  }

  public createRequest(serverNode: ServerNode): void {
    this.endPoint = StringUtil.format('{url}/databases/{database}', serverNode, this.params);
    super.createRequest(serverNode);
  }

  public setResponse(response: IResponse): IRavenResponse | IRavenResponse[] | void {
    const responseBody: IResponseBody = response.body;
    const status: StatusCode = response.statusCode;

    if (!responseBody) {
      throw new ErrorResponseException(StringUtil.format('Could not find index {0}', this.indexName));
    }

    if (![StatusCodes.Ok, StatusCodes.Accepted].includes(status)) {
      throw new ErrorResponseException(responseBody.Error)
    }

    return responseBody;
  }
}
