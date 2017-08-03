import {PatchResultOperation} from './Operation';
import {RavenCommand} from '../RavenCommand';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {PatchCommand} from '../Commands/PatchCommand';
import {PatchRequest, IPatchRequestOptions} from "../../Http/Request/PatchRequest";

export class PatchOperation extends PatchResultOperation {  
  protected id?: string;
  protected patch: PatchRequest;
  protected options?: IPatchRequestOptions;

  constructor(id: string, patch: PatchRequest, options?: IPatchRequestOptions) {
    super();
    this.id = id;
    this.patch = patch;
    this.options = options;
  }

  public getCommand(conventions: DocumentConventions): RavenCommand {
    return new PatchCommand(this.id, this.patch, this.options);
  } 
}