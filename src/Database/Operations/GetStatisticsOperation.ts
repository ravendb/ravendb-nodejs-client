import {AdminOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {GetStatisticsCommand} from '../Commands/GetStatisticsCommand';

export class GetStatisticsOperation extends AdminOperation {  
  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new GetStatisticsCommand();
  } 
}