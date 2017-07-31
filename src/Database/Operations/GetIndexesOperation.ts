import {AdminOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {GetIndexesCommand} from '../Commands/GetIndexesCommand';

export class GetIndexesOperation extends AdminOperation {
  protected start?: number;
  protected pageSize?: number;

  constructor(start: number = 0, pageSize: number = 10) {
    super();
    this.start = start;
    this.pageSize = pageSize
  }
  
  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new GetIndexesCommand(this.start, this.pageSize);
  } 
}