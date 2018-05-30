import { OperationCompletionAwaiter } from "./OperationCompletionAwaiter";
import * as BluebirdPromise from "bluebird";
import {
    IOperation,
    AwaitableOperation,
    OperationIdResult} from "./OperationAbstractions";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { SessionInfo } from "../Session/IDocumentSession";

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

    // TODO
    // public PatchStatus send(PatchOperation operation, SessionInfo sessionInfo) {
    //     RavenCommand<PatchResult> command = 
    // operation.getCommand(store, requestExecutor.getConventions(), requestExecutor.getCache());

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
