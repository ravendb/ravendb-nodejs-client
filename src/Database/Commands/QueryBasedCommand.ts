import {RequestMethod} from "../../Http/Request/RequestMethod";
import {IndexQuery} from "../Indexes/IndexQuery";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {RavenCommand} from "../RavenCommand";
import {ServerNode} from "../../Http/ServerNode";
import {InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";

export abstract class QueryBasedCommand extends RavenCommand {
  protected query?: IndexQuery;
  protected options?: QueryOperationOptions;

  constructor(method: RequestMethod, query: IndexQuery, options?: QueryOperationOptions) {
    super('', method);
    this.query = query;
    this.options = options || new QueryOperationOptions();
  }

  public createRequest(serverNode: ServerNode): void {
    const query: IndexQuery = this.query;
    const options: QueryOperationOptions = this.options;

    if (!(query instanceof IndexQuery)) {
      throw new InvalidOperationException('Query must be instance of IndexQuery class');
    }

    if (!(options instanceof QueryOperationOptions)) {
      throw new InvalidOperationException('Options must be instance of QueryOperationOptions class');
    }

    this.endPoint = StringUtil.format('{url}/databases/{database}/queries', serverNode);

    this.params = {
      allowStale: options.allowStale,
      details: options.retrieveDetails,
      maxOpsPerSec: options.maxOpsPerSec
    };

    if (options.allowStale && options.staleTimeout) {
      this.addParams('staleTimeout', options.staleTimeout);
    }     
  }
}

