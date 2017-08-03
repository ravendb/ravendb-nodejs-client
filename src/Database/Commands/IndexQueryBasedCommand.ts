import {RequestMethod} from "../../Http/Request/RequestMethod";
import {IndexQuery} from "../Indexes/IndexQuery";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {RavenCommand} from "../RavenCommand";
import {ServerNode} from "../../Http/ServerNode";
import {TypeUtil} from "../../Utility/TypeUtil";
import {InvalidOperationException} from "../DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";

export abstract class IndexQueryBasedCommand extends RavenCommand {
  protected indexName?: string;
  protected query?: IndexQuery;
  protected options?: QueryOperationOptions;

  constructor(method: RequestMethod, indexName: string, query: IndexQuery, options?: QueryOperationOptions) {
    super('', method);
    this.indexName = indexName;
    this.query = query;
    this.options = options || new QueryOperationOptions();
  }

  public createRequest(serverNode: ServerNode): void {
    const query: IndexQuery = this.query;
    const options: QueryOperationOptions = this.options;

    if (TypeUtil.isNone(this.indexName)) {
      throw new InvalidOperationException('Empty index_name is not valid');
    }

    if (!(query instanceof IndexQuery)) {
      throw new InvalidOperationException('Query must be instance of IndexQuery class');
    }

    if (!(options instanceof QueryOperationOptions)) {
      throw new InvalidOperationException('Options must be instance of QueryOperationOptions class');
    }

    this.params = {
      pageSize: query.pageSize,
      allowStale: options.allowStale,
      details: options.retrieveDetails
    };

    this.endPoint += StringUtil.format('/queries/{0}', this.indexName);
    query.query && this.addParams('Query', query.query);
    options.maxOpsPerSec && this.addParams('maxOpsPerSec', options.maxOpsPerSec);
    options.staleTimeout && this.addParams('staleTimeout', options.staleTimeout);
  }
}

