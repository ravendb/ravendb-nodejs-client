import { OperationCompletionAwaiter } from './OperationAwaiter';
import * as BluebirdPromise from "bluebird";
import {
    IOperation,
    AwaitableOperation,
    OperationIdResult,
    IAwaitableOperation
} from "./OperationBase";
import { IDocumentStore } from "../../Documents/IDocumentStore";
import { ClusterRequestExecutor } from "../../Http/Request/ClusterRequestExecutor";
import { IRequestExecutor, RequestExecutor } from "../../Http/RequestExecutor";
//import {PatchStatuses, IPatchResult} from '../../Http/Request/PatchRequest';
import { StatusCodes } from "../../Http/StatusCode";
import { IRavenObject } from "../../Types/IRavenObject";
import { IDisposable } from "../../Types/Contracts";
import { DocumentConventions } from "../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { IRequestAuthOptions } from "../../Auth/AuthOptions";
import { IRavenResponse } from "../../Types";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { SessionInfo } from "../Session";

export class OperationExecutor {

    private _store: DocumentStoreBase;
    private _databaseName: string;
    private _requestExecutor: RequestExecutor;

    public constructor(store: DocumentStoreBase, databaseName?: string) {
        this._store = store;
        this._databaseName = databaseName ? databaseName : store.database;
        this._requestExecutor = store.getRequestExecutor(databaseName);
    }

    public forDatabase(databaseName: string): OperationExecutor {
        if (!databaseName) {
            throwError("InvalidArgumentException", `Argument 'databaseName' is invalid: ${databaseName}.`);
        }
        if (this._databaseName.toLowerCase() === databaseName.toLowerCase()) {
            return this;
        }

        return new OperationExecutor(this._store, databaseName);
    }

    public send(operation: AwaitableOperation): Promise<OperationCompletionAwaiter>;
    public send(operation: AwaitableOperation, sessionInfo?: SessionInfo): Promise<OperationCompletionAwaiter>;
    public send<TResult>(operation: IOperation<TResult>): Promise<TResult>;
    public send<TResult>(operation: IOperation<TResult>, sessionInfo?: SessionInfo): Promise<TResult>;
    public send<TResult>(
        operation: AwaitableOperation | IOperation<TResult>,
        sessionInfo?: SessionInfo): Promise<OperationCompletionAwaiter | TResult> {

        const command =
            operation.getCommand(this._store, this._requestExecutor.conventions, this._requestExecutor.cache);

        const result = BluebirdPromise.resolve()
            .then(() => this._requestExecutor.execute(command as RavenCommand<TResult>, sessionInfo))
            .then(() => {
                if (operation.resultType === "OPERATION_ID") {
                    const idResult = command.result as OperationIdResult;
                    const awaiter = new OperationCompletionAwaiter(
                        this._requestExecutor, this._requestExecutor.conventions, idResult.operationId);
                    return awaiter;
                }

                return command.result as TResult;
            });

        return  Promise.resolve(result);
    }

    // public PatchStatus send(PatchOperation operation, SessionInfo sessionInfo) {
    //     RavenCommand<PatchResult> command = operation.getCommand(store, requestExecutor.getConventions(), requestExecutor.getCache());

    //     requestExecutor.execute(command, sessionInfo);

    //     if (command.getStatusCode() == HttpStatus.SC_NOT_MODIFIED) {
    //         return PatchStatus.NOT_MODIFIED;
    //     }

    //     if (command.getStatusCode() == HttpStatus.SC_NOT_FOUND) {
    //         return PatchStatus.DOCUMENT_DOES_NOT_EXIST;
    //     }

    //     return command.getResult().getStatus();
    // }

    // @SuppressWarnings("unchecked")
    // public <TEntity> PatchOperation.Result<TEntity> send(Class<TEntity> entityClass, PatchOperation operation, SessionInfo sessionInfo) {
    //     RavenCommand<PatchResult> command = operation.getCommand(store, requestExecutor.getConventions(), requestExecutor.getCache());

    //     requestExecutor.execute(command, sessionInfo);

    //     PatchOperation.Result<TEntity> result = new PatchOperation.Result<>();

    //     if (command.getStatusCode() == HttpStatus.SC_NOT_MODIFIED) {
    //         result.setStatus(PatchStatus.NOT_MODIFIED);
    //         return result;
    //     }

    //     if (command.getStatusCode() == HttpStatus.SC_NOT_FOUND) {
    //         result.setStatus(PatchStatus.DOCUMENT_DOES_NOT_EXIST);
    //         return result;
    //     }

    //     result.setStatus(command.getResult().getStatus());
    //     result.setDocument((TEntity) requestExecutor.getConventions().deserializeEntityFromJson(entityClass, command.getResult().getModifiedDocument()));
    //     return result;
    // }
}

// export abstract class AbstractOperationExecutor implements IOperationExecutor {
//   protected store: IDocumentStore;
//   private _requestExecutor: IRequestExecutor;
//   protected abstract requestExecutorFactory(): IRequestExecutor;  

//   protected get requestExecutor(): IRequestExecutor {
//     if (!this._requestExecutor) {
//       this._requestExecutor = this.requestExecutorFactory();
//     }

//     return this._requestExecutor;
//   };

//   constructor(store: IDocumentStore) {
//     this.store = store;
//   }

//   public async send(operation: IOperation): Promise<IRavenResponse | IRavenResponse[] | void> {
//     const store: IDocumentStore = this.store;
//     const executor: IRequestExecutor = this.requestExecutor;
//     const conventions: DocumentConventions = store.conventions;    
//     let errorMessage: string = "Invalid object passed as an operation";
//     let command: RavenCommand;

//     if (operation instanceof AbstractOperation) {
//       try {
//         command = (operation instanceof Operation) 
//         ? operation.getCommand(conventions, store)
//         : (<AbstractOperation>operation).getCommand(conventions);    
//       } catch (exception) {
//         errorMessage = `Can't instantiate command required for run operation: ${exception.message}`;
//       }      
//     }

//     if (!command) {
//       return BluebirdPromise.reject(new InvalidOperationException(errorMessage));
//     }

//     return executor.execute(command)
//       .then((result: IRavenResponse | IRavenResponse[] | void): BluebirdPromise.Thenable<IRavenResponse 
//       | IRavenResponse[] | void> | IRavenResponse | IRavenResponse[] | void => 
//       this.setResponse(operation, command, result)
//     );
//   }

//   protected setResponse(operation: IOperation, command: RavenCommand, response: IRavenResponse | IRavenResponse[] | void): BluebirdPromise.Thenable<IRavenResponse 
//     | IRavenResponse[] | void> | IRavenResponse | IRavenResponse[] | void 
//   {
//     return response;
//   }
// }

// export abstract class AbstractDatabaseOperationExecutor extends AbstractOperationExecutor {
//   protected database?: string = null;
//   protected executorsByDatabase: IRavenObject<IOperationExecutor> = {};

//   constructor(store: IDocumentStore, database?: string) {
//     super(store);
//     this.database = database || null;
//   }

//   public forDatabase(database: string): IOperationExecutor {
//     if (database === this.database) {
//       return this;
//     } 

//     if (!(database in this.executorsByDatabase)) {      
//       this.executorsByDatabase[database] = new (
//         <new(store: IDocumentStore, defaultDatabase?: string) => 
//         AbstractDatabaseOperationExecutor>this.constructor
//       )(this.store, database);
//     }

//     return this.executorsByDatabase[database];
//   }

//   protected requestExecutorFactory(): IRequestExecutor {
//     return this.store.getRequestExecutor(this.database);
//   }
// }

// export class OperationExecutor extends AbstractDatabaseOperationExecutor {
//   protected setResponse(operation: IOperation, command: RavenCommand, response: IRavenResponse | IRavenResponse[] | void): BluebirdPromise.Thenable<IRavenResponse 
//     | IRavenResponse[] | void> | IRavenResponse | IRavenResponse[] | void 
//   {
//     const store: IDocumentStore = this.store;
//     const json: IRavenObject = <IRavenObject>response;
//     const conventions: DocumentConventions = store.conventions;  

//     if (operation instanceof AwaitableOperation) {
//       const awaiter: OperationAwaiter = new OperationAwaiter(
//         this.requestExecutor, json.OperationId
//       );

//       return awaiter.waitForCompletion();
//     }

//     if (operation instanceof PatchResultOperation) {
//       let patchResult: IPatchResult;

//       switch (command.serverResponse.statusCode) {
//         case StatusCodes.NotModified:
//           patchResult = {Status: PatchStatuses.NotModified};
//           break;
//         case StatusCodes.NotFound:
//           patchResult = {Status: PatchStatuses.DocumentDoesNotExist};
//           break;
//         default:
//           patchResult = {
//             Status: json.Status,
//             Document: conventions.convertToDocument(json.ModifiedDocument)
//           };          
//           break;  
//       }

//       response = <IRavenResponse>patchResult;
//     }

//     return super.setResponse(operation, command, response);
//   }
// }

// export class ServerOperationExecutor extends AbstractOperationExecutor implements IDisposable {
//     protected requestExecutorFactory(): IRequestExecutor {
//         const store: IDocumentStore = this.store;
//         const conventions: DocumentConventions = store.conventions;
//         const authOptions = <IRequestAuthOptions>store.authOptions;

//         return conventions.disableTopologyUpdates
//             ? ClusterRequestExecutor.createForSingleNode(store.singleNodeUrl, authOptions)
//             : ClusterRequestExecutor.create(store.urls, authOptions);
//     }

//     public async send(operation: IOperation): Promise<IRavenResponse | IRavenResponse[] | void> {
//         if (!(operation instanceof ServerOperation)) {
//             return BluebirdPromise.reject(
//                 new InvalidOperationException("Invalid operation passed. It should be derived from ServerOperation"));
//         }

//         return super.send(operation);
//     }

//     public dispose(): void {
//         this.requestExecutor.dispose();
//     }
// }

// export class AdminOperationExecutor extends AbstractDatabaseOperationExecutor {
//     private _server: ServerOperationExecutor;

//     public get server(): ServerOperationExecutor {
//         if (!this._server) {
//             this._server = new ServerOperationExecutor(this.store);
//         }

//         return this._server;
//     }

//     public async send(operation: IOperation): Promise<IRavenResponse | IRavenResponse[] | void> {
//         if (!(operation instanceof AdminOperation)) {
//             return BluebirdPromise.reject(new InvalidOperationException("Invalid operation passed. It should be derived from ServerOperation"));
//         }

//         return super.send(operation);
//     }
// }
