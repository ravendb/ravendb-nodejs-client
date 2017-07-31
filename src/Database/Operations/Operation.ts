import {RavenCommand} from '../RavenCommand';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';

export interface IOperation {
  getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand;  
}

export abstract class AbstractOperation implements IOperation {
  public abstract getCommand(conventions: DocumentConventions): RavenCommand;  
}

export abstract class Operation extends AbstractOperation {
  public abstract getCommand(conventions: DocumentConventions, store?: IDocumentStore): RavenCommand;  
}

export abstract class AdminOperation extends AbstractOperation {

}

export abstract class ServerOperation extends AbstractOperation {
  
}

export abstract class PatchResultOperation extends Operation {

}

export abstract class AwaitableOperation extends Operation {
  
}