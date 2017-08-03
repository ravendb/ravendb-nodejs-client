import {IndexQueryBasedOperation} from './IndexQueryBasedOperation';
import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {QueryOperationOptions} from "../Operations/QueryOperationOptions";
import {IndexQuery} from "../Indexes/IndexQuery";
import {PatchByIndexCommand} from '../Commands/PatchByIndexCommand';
import {PatchRequest} from "../../Http/Request/PatchRequest";

export class PatchByIndexOperation extends IndexQueryBasedOperation {
  protected patch?: PatchRequest = null;

  constructor(indexName: string, queryToUpdate: IndexQuery, patch?: PatchRequest, options?: QueryOperationOptions) {
    super(indexName, queryToUpdate, options);
    this.patch = patch;
  }

  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new PatchByIndexCommand(this.indexName, this.query, this.patch, this.options);
  } 
}