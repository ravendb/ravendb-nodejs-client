import * as BluebirdPromise from 'bluebird';
import {AbstractOperation} from './Operation';
import {IDocumentStore} from '../../Documents/IDocumentStore';
import {IRequestExecutor} from '../../Http/Request/RequestExecutor';
import {IRavenResponse} from '../RavenCommandResponse';
import {IRavenObject} from '../IRavenObject';

export interface IOperationExecutor {
  send(operation: AbstractOperation): BluebirdPromise<IRavenResponse | IRavenResponse[] | void>;
}

export abstract class AbstractOperationExecutor implements IOperationExecutor {
  protected store: IDocumentStore;
  protected requestExecutor: IRequestExecutor;

  protected abstract requestExecutorFactory(): IRequestExecutor;
  protected abstract setResponse(response: IRavenResponse): IRavenResponse | IRavenResponse[] | void;

  constructor(store: IDocumentStore) {
    this.store = store;
    this.requestExecutor = this.requestExecutorFactory();
  }

  send(operation: AbstractOperation): BluebirdPromise<IRavenResponse | IRavenResponse[] | void> {
    return BluebirdPromise.resolve();
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
  
}

export class AdminOperationExecutor extends AbstractDatabaseOperationExecutor {
  
}

export class ServerOperationExecutor extends AbstractOperationExecutor {
  protected
}