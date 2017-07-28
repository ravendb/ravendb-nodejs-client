import * as BluebirdPromise from 'bluebird';
import {IOperation, AbstractOperation, Operation, AwaitableOperation, PatchOperation} from './Operation';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {ClusterRequestExecutor} from '../../Http/Request/ClusterRequestExecutor';
import {IRequestExecutor} from '../../Http/Request/RequestExecutor';
import {PatchStatus, PatchStatuses} from '../../Http/Request/PatchRequest';
import {StatusCodes} from '../../Http/Response/StatusCode';
import {IRavenResponse} from '../RavenCommandResponse';
import {IRavenObject} from '../IRavenObject';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {RavenCommand} from '../RavenCommand';
import {InvalidOperationException} from '../DatabaseExceptions';
import {OperationAwaiter} from './OperationAwaiter';

export interface IOperationExecutor {
  send(operation: IOperation): BluebirdPromise<IRavenResponse | IRavenResponse[] | void>;
}

export abstract class AbstractOperationExecutor implements IOperationExecutor {
  protected store: IDocumentStore;
  protected requestExecutor: IRequestExecutor;

  protected abstract requestExecutorFactory(): IRequestExecutor;  

  constructor(store: IDocumentStore) {
    this.store = store;
    this.requestExecutor = this.requestExecutorFactory();
  }

  public send(operation: IOperation): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> {
    const store: IDocumentStore = this.store;
    const executor: IRequestExecutor = this.requestExecutor;
    const conventions: DocumentConventions = store.conventions;    
    let command: RavenCommand;
    
    if (operation instanceof AbstractOperation) {
      command = (operation instanceof Operation) 
        ? operation.getCommand(conventions, store)
        : (<AbstractOperation>operation).getCommand(conventions);    
    }
    
    if (!command) {
      return BluebirdPromise.reject(new InvalidOperationException('Invalid object passed as an operation'));
    }

    return executor.execute(command)
      .then((result: IRavenResponse | IRavenResponse[] | void): BluebirdPromise.Thenable<IRavenResponse 
      | IRavenResponse[] | void> | IRavenResponse | IRavenResponse[] | void => 
      this.setResponse(operation, command, result)
    );
  }

  protected setResponse(operation: IOperation, command: RavenCommand, response: IRavenResponse | IRavenResponse[] | void): BluebirdPromise.Thenable<IRavenResponse 
    | IRavenResponse[] | void> | IRavenResponse | IRavenResponse[] | void 
  {
    return response;
  }
}

export abstract class AbstractDatabaseOperationExecutor extends AbstractOperationExecutor {
  protected database?: string = null;
  protected executorsByDatabase: IRavenObject<IOperationExecutor> = {};

  constructor(store: IDocumentStore, database?: string) {
    super(store);
    this.database = database || null;
  }

  public forDatabase(database: string): IOperationExecutor {
    if (database === this.database) {
      return this;
    } 

    if (!(database in this.executorsByDatabase)) {      
      this.executorsByDatabase[database] = new (
        <new(store: IDocumentStore, defaultDatabase?: string) => 
        AbstractDatabaseOperationExecutor>this.constructor
      )(this.store, database);
    }

    return this.executorsByDatabase[database];
  }

  protected requestExecutorFactory(): IRequestExecutor {
    return this.store.getRequestExecutor(this.database);
  }
}

export class OperationExecutor extends AbstractDatabaseOperationExecutor {
  protected setResponse(operation: IOperation, command: RavenCommand, response: IRavenResponse | IRavenResponse[] | void): BluebirdPromise.Thenable<IRavenResponse 
    | IRavenResponse[] | void> | IRavenResponse | IRavenResponse[] | void 
  {
    const store: IDocumentStore = this.store;
    const json: IRavenObject = <IRavenObject>response;
    const conventions: DocumentConventions = store.conventions;  
    let updatedResponse: IRavenResponse = <IRavenResponse>response;

    if (operation instanceof AwaitableOperation) {
      const awaiter: OperationAwaiter = new OperationAwaiter(
        this.requestExecutor, json.OperationId
      );

      return awaiter.waitForCompletion();
    }

    if (operation instanceof PatchOperation) {
      switch (command.serverResponse.statusCode) {
        case StatusCodes.NotModified:
          updatedResponse = {Status: PatchStatuses.NotModified};
          break;
        case StatusCodes.NotFound:
          updatedResponse = {Status: PatchStatuses.DocumentDoesNotExist};
          break;
        default:
          updatedResponse = {
            Status: json.Status,
            Document: conventions.convertToDocument(json.ModifiedDocument)
          };
          
          break;  
      }
    }

    return super.setResponse(operation, command, updatedResponse);
  }
}

export class ServerOperationExecutor extends AbstractOperationExecutor {
  protected requestExecutorFactory(): IRequestExecutor {
    const store: IDocumentStore = this.store;
    const conventions: DocumentConventions = store.conventions;    

    return conventions.disableTopologyUpdates
      ? ClusterRequestExecutor.createForSingleNode(store.singleNodeUrl)
      : ClusterRequestExecutor.create(store.urls);
  }
}

export class AdminOperationExecutor extends AbstractDatabaseOperationExecutor {
  private _server: ServerOperationExecutor;

  public get server(): ServerOperationExecutor {
    if (!this._server) {
      this._server = new ServerOperationExecutor(this.store);
    }

    return this._server;
  }
}
