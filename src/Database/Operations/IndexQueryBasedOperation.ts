import {AwaitableOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {IndexQuery} from "../Indexes/IndexQuery";
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
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