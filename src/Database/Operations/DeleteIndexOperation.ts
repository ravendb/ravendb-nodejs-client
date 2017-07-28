import {AdminOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {DeleteIndexCommand} from '../Commands/DeleteIndexCommand';

export class DeleteIndexOperation extends AdminOperation {
  protected indexName?: string;

  constructor(indexName: string) {
    super();
    this.indexName = indexName;
  }
  
  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new DeleteIndexCommand(this.indexName);
  } 
}