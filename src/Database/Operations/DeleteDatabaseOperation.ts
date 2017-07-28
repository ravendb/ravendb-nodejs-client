import {Operation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {DeleteDatabaseCommand} from '../Commands/DeleteDatabaseCommand';

export class DeleteDatabaseOperation extends Operation {
  protected databaseId?: string;
  protected hardDelete: boolean = false;

  constructor(databaseId: string, hardDelete: boolean = false) {
    super();

    this.databaseId = databaseId;
    this.hardDelete = hardDelete;
  }

  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new DeleteDatabaseCommand(this.databaseId, this.hardDelete);
  } 
}