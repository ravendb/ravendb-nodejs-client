import {QueryBasedOperation} from './QueryBasedOperation';
import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {QueryOperationOptions} from "./QueryOperationOptions";
import {IndexQuery} from "../Indexes/IndexQuery";
import {PatchByQueryCommand} from '../Commands/PatchByQueryCommand';
import {PatchRequest} from "../../Http/Request/PatchRequest";

export class PatchByQueryOperation extends QueryBasedOperation {
  protected query: IndexQuery = null;
  protected options: QueryOperationOptions = null;

  constructor(queryToUpdate: IndexQuery, options?: QueryOperationOptions) {
    super(queryToUpdate, options);
    this.query = queryToUpdate;
    this.options = options;
  }

  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new PatchByQueryCommand(this.query, this.options);
  }
}