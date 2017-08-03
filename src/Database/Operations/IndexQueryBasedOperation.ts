import {AwaitableOperation} from './Operation';
import {IndexQuery} from "../Indexes/IndexQuery";
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";

export abstract class IndexQueryBasedOperation extends AwaitableOperation {
  protected indexName?: string;
  protected query?: IndexQuery;
  protected options?: QueryOperationOptions;

  constructor(indexName: string, query: IndexQuery, options?: QueryOperationOptions) {
    super();
    this.indexName = indexName;
    this.query = query;
    this.options = options || new QueryOperationOptions();
  }
}