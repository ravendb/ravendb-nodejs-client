import {QueryBasedOperation} from './QueryBasedOperation';
import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {DeleteByQueryCommand} from '../Commands/DeleteByQueryCommand';

export class DeleteByIndexOperation extends QueryBasedOperation {
  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new DeleteByQueryCommand(this.query, this.options);
  } 
}