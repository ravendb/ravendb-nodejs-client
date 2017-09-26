import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {IndexQuery} from "../Indexes/IndexQuery";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {QueryBasedCommand} from "./QueryBasedCommand";

export class DeleteByQueryCommand extends QueryBasedCommand {  
  constructor(query: IndexQuery, options?: QueryOperationOptions) {
    super(RequestMethods.Delete, query, options);
  }

  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);
    this.payload = this.query.toJson();
  }
}
