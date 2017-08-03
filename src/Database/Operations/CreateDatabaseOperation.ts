import {ServerOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {DatabaseDocument} from "../DatabaseDocument";
import {CreateDatabaseCommand} from '../Commands/CreateDatabaseCommand';

export class CreateDatabaseOperation extends ServerOperation {
  protected replicationFactor: number;
  protected databaseDocument: DatabaseDocument;

  constructor(databaseDocument: DatabaseDocument, replicationFactor: number = 1) {
    super();
    this.databaseDocument = databaseDocument;
    this.replicationFactor = replicationFactor || 1;
  }

  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new CreateDatabaseCommand(this.databaseDocument, this.replicationFactor);
  } 
}