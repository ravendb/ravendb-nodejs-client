import {AwaitableOperation} from './Operation';
import {IndexQuery} from "../Indexes/IndexQuery";
import {QueryOperationOptions} from "./QueryOperationOptions";

export abstract class QueryBasedOperation extends AwaitableOperation {
  protected query?: IndexQuery;
  protected options?: QueryOperationOptions;

  constructor(query: IndexQuery, options?: QueryOperationOptions) {
    super();
    this.query = query;
    this.options = options || new QueryOperationOptions();
  }
}