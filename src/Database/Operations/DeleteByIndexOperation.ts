import {IndexQueryBasedOperation} from './IndexQueryBasedOperation';
import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {DatabaseDocument} from "../DatabaseDocument";
import {DeleteByIndexCommand} from '../Commands/DeleteByIndexCommand';

export class DeleteByIndexOperation extends IndexQueryBasedOperation {
  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new DeleteByIndexCommand(this.indexName, this.query, this.options);
  } 
}