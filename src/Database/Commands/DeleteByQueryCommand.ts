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
import {IJsonable} from "../../Typedef/Contracts";

export class DeleteByQueryCommand extends QueryBasedCommand {  
  constructor(query: IndexQuery, options?: QueryOperationOptions) {
    super(RequestMethods.Delete, query, options);
  }

  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);
    this.payload = this.query.toJson();
  }
}
