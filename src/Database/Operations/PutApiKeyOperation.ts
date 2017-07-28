import {ServerOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {PutApiKeyCommand} from '../Commands/PutApiKeyCommand';
import {ApiKeyDefinition} from "../Auth/ApiKeyDefinition";

export class PutApiKeyOperation extends ServerOperation {
  protected name: string;
  protected apiKey: ApiKeyDefinition;

  constructor(name: string, apiKey: ApiKeyDefinition) {
    super();
    this.name = name;
    this.apiKey = apiKey;
  }
  
  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new PutApiKeyCommand(this.name, this.apiKey);
  } 
}