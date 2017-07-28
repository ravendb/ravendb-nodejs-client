import {Operation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {DatabaseDocument} from "../DatabaseDocument";
import {CreateDatabaseCommand} from '../Commands/CreateDatabaseCommand';

export class CreateDatabaseOperation extends Operation {
  protected replicationFactor: number;
  protected databaseDocument: DatabaseDocument;

  constructor(databaseDocument: DatabaseDocument, replicationFactor: number = 1) {
    super();
    this.databaseDocument = databaseDocument;
    this.replicationFactor = replicationFactor || 1;
  }

  public getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand {
    return new CreateDatabaseCommand(this.databaseDocument, this.replicationFactor);
  } 
}