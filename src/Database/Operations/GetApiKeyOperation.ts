import {ServerOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {GetApiKeyCommand} from '../Commands/GetApiKeyCommand';

export class GetApiKeyOperation extends ServerOperation {
  protected name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
  
  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new GetApiKeyCommand(this.name);
  } 
}