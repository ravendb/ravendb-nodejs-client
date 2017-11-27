import * as BluebirdPromise from 'bluebird';
import {IOperation, AbstractOperation, Operation, AwaitableOperation, PatchResultOperation, ServerOperation, AdminOperation} from './Operation';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {ClusterRequestExecutor} from '../../Http/Request/ClusterRequestExecutor';
import {IRequestExecutor} from '../../Http/Request/RequestExecutor';
import {PatchStatuses, IPatchResult} from '../../Http/Request/PatchRequest';
import {StatusCodes} from '../../Http/Response/StatusCode';
import {IRavenResponse} from '../RavenCommandResponse';
import {IRavenObject} from '../../Typedef/IRavenObject';
import {IDisposable} from '../../Typedef/Contracts';
import {DocumentConventions} from '../../Documents/Conventions/DocumentConventions';
import {RavenCommand} from '../RavenCommand';
import {InvalidOperationException} from '../DatabaseExceptions';
import {OperationAwaiter} from './OperationAwaiter';

export interface IOperationExecutor {
  send(operation: IOperation): Promise<IRavenResponse | IRavenResponse[] | void>;
}

export abstract class AbstractOperationExecutor implements IOperationExecutor {
  protected store: IDocumentStore;
  private _requestExecutor: IRequestExecutor;
  protected abstract requestExecutorFactory(): IRequestExecutor;  

  protected get requestExecutor(): IRequestExecutor {
    if (!this._requestExecutor) {
      this._requestExecutor = this.requestExecutorFactory();
    }

    return this._requestExecutor;
  };

  constructor(store: IDocumentStore) {
    this.store = store;
  }

  public async send(operation: IOperation): Promise<IRavenResponse | IRavenResponse[] | void> {
    const store: IDocumentStore = this.store;
    const executor: IRequestExecutor = this.requestExecutor;
    const conventions: DocumentConventions = store.conventions;    
    let errorMessage: string = 'Invalid object passed as an operation';
    let command: RavenCommand;
    
    if (operation instanceof AbstractOperation) {
      try {
        command = (operation instanceof Operation) 
        ? operation.getCommand(conventions, store)
        : (<AbstractOperation>operation).getCommand(conventions);    
      } catch (exception) {
        errorMessage = `Can't instantiate command required for run operation: ${exception.message}`;
      }      
    }
    
    if (!command) {
      return BluebirdPromise.reject(new InvalidOperationException(errorMessage));
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

    if (operation instanceof AwaitableOperation) {
      const awaiter: OperationAwaiter = new OperationAwaiter(
        this.requestExecutor, json.OperationId
      );

      return awaiter.waitForCompletion();
    }

    if (operation instanceof PatchResultOperation) {
      let patchResult: IPatchResult;

      switch (command.serverResponse.statusCode) {
        case StatusCodes.NotModified:
          patchResult = {Status: PatchStatuses.NotModified};
          break;
        case StatusCodes.NotFound:
          patchResult = {Status: PatchStatuses.DocumentDoesNotExist};
          break;
        default:
          patchResult = {
            Status: json.Status,
            Document: conventions.convertToDocument(json.ModifiedDocument)
          };          
          break;  
      }

      response = <IRavenResponse>patchResult;
    }

    return super.setResponse(operation, command, response);
  }
}

export class ServerOperationExecutor extends AbstractOperationExecutor implements IDisposable {
  protected requestExecutorFactory(): IRequestExecutor {
    const store: IDocumentStore = this.store;
    const conventions: DocumentConventions = store.conventions;    

    return conventions.disableTopologyUpdates
      ? ClusterRequestExecutor.createForSingleNode(store.singleNodeUrl)
      : ClusterRequestExecutor.create(store.urls);
  }

  private sendOperation(operation: IOperation){
        return super.send(operation);
  }

  public async send(operation: IOperation): Promise<IRavenResponse | IRavenResponse[] | void> {
    if (!(operation instanceof ServerOperation)) {
      return BluebirdPromise.reject(new InvalidOperationException('Invalid operation passed. It should be derived from ServerOperation'));
    }

    return this.sendOperation(operation);
  }

  public dispose(): void {
    this.requestExecutor.dispose();
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

  private sendOperation(operation: IOperation){
        return super.send(operation);
  }

  public async send(operation: IOperation): Promise<IRavenResponse | IRavenResponse[] | void> {
    if (!(operation instanceof AdminOperation)) {
      return BluebirdPromise.reject(new InvalidOperationException('Invalid operation passed. It should be derived from ServerOperation'));
    }

      return this.sendOperation(operation);
  }
}
