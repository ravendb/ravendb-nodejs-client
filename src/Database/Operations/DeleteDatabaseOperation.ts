import {ServerOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {ServerNode} from '../../Http/ServerNode';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {DeleteDatabaseCommand} from '../Commands/DeleteDatabaseCommand';

export class DeleteDatabaseOperation extends ServerOperation {
  protected databaseId?: string;
  protected hardDelete: boolean = false;
  protected fromNode: ServerNode = null;
  protected timeToWaitForConfirmation: number = null;

  constructor(databaseId: string, hardDelete: boolean = false, fromNode?: ServerNode, timeToWaitForConfirmation?: number) {
    super();
    this.fromNode = fromNode;
    this.databaseId = databaseId;
    this.hardDelete = hardDelete;
    this.timeToWaitForConfirmation = timeToWaitForConfirmation;
  }

  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new DeleteDatabaseCommand(this.databaseId, this.hardDelete, this.fromNode, this.timeToWaitForConfirmation);
  } 
}