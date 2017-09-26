import {QueryBasedCommand} from "./QueryBasedCommand";
import {IndexQuery} from "../Indexes/IndexQuery";
import {PatchRequest} from "../../Http/Request/PatchRequest";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {InvalidOperationException} from "../DatabaseExceptions";
import {ServerNode} from "../../Http/ServerNode";

export class  PatchByQueryCommand extends QueryBasedCommand {
  protected patch?: PatchRequest = null;

  constructor(queryToUpdate: IndexQuery, patch?: PatchRequest, options?: QueryOperationOptions) {
    super(RequestMethods.Patch, queryToUpdate, options);
    this.patch = patch;
  }

  public createRequest(serverNode: ServerNode): void {
    super.createRequest(serverNode);

    if (!(this.patch instanceof PatchRequest)) {
      throw new InvalidOperationException('Patch must me instanceof PatchRequest class');
    }

    this.payload = {
      "Patch": this.patch.toJson(),
      "Query": this.query.toJson()
    };
  }
}
