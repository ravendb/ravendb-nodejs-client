import {AdminOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {GetIndexCommand} from '../Commands/GetIndexCommand';

export class GetIndexOperation extends AdminOperation {
  protected indexName?: string;

  constructor(indexName: string) {
    super();
    this.indexName = indexName;
  }
  
  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new GetIndexCommand(this.indexName);
  } 
}