import {QueryBasedCommand} from "./QueryBasedCommand";
import {IndexQuery} from "../Indexes/IndexQuery";
import {PatchRequest} from "../../Http/Request/PatchRequest";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException} from "../DatabaseExceptions";
import {ServerNode} from "../../Http/ServerNode";

export class PatchByQueryCommand extends QueryBasedCommand {
  constructor(queryToUpdate: IndexQuery, options?: QueryOperationOptions) {
    super(RequestMethods.Patch, queryToUpdate, options);
  }

  public createRequest(serverNode: ServerNode): void {
    const queryToUpdate: IndexQuery = this.query;

    super.createRequest(serverNode);

    this.payload = {
      "Query": queryToUpdate.toJson()
    };
  }
}
