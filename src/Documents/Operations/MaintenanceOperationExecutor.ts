import { OperationCompletionAwaiter } from "./OperationCompletionAwaiter";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { RequestExecutor } from "../..";
import { IMaintenanceOperation, AwaitableMaintenanceOperation, OperationIdResult } from "./OperationAbstractions";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerOperationExecutor } from "./ServerOperationExecutor";

export class MaintenanceOperationExecutor {

    private _store: DocumentStoreBase;
    private _databaseName: string;
    private _requestExecutor: RequestExecutor;
    private _serverOperationExecutor: ServerOperationExecutor;

    public constructor(store: DocumentStoreBase, databaseName?: string) {
        this._store = store;
        this._databaseName = databaseName;
        this._requestExecutor = store.getRequestExecutor(databaseName);
    }

    public get server(): ServerOperationExecutor {
        if (!this._serverOperationExecutor) {
            this._serverOperationExecutor = new ServerOperationExecutor(this._store);
        } 
        
        return this._serverOperationExecutor;
    }

    public forDatabase(databaseName: string): MaintenanceOperationExecutor {
        if (this._databaseName 
            && this._databaseName.toLowerCase() === databaseName.toLowerCase()) {
            return this;
        }

        return new MaintenanceOperationExecutor(this._store, databaseName);
    }

    public send(operation: AwaitableMaintenanceOperation): Promise<OperationCompletionAwaiter>;
    public send<TResult>(operation: IMaintenanceOperation<TResult>): Promise<TResult>;
    public send<TResult>(
        operation: AwaitableMaintenanceOperation | IMaintenanceOperation<TResult>)
        : Promise<OperationCompletionAwaiter | TResult> {

        const command = operation.getCommand(this._requestExecutor.conventions);

        const result = Promise.resolve()
            .then(() => this._requestExecutor.execute(command as RavenCommand<TResult>))
            .then(() => {
                if (operation.resultType === "OperationId") {
                    const idResult = command.result as OperationIdResult;
                    const awaiter = new OperationCompletionAwaiter(
                        this._requestExecutor, this._requestExecutor.conventions, idResult.operationId);
                    return awaiter;
                }

                return command.result as TResult;
            });

        return result;
    }
}
