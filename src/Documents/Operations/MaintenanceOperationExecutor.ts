import { DocumentStoreBase } from "../DocumentStoreBase";
import { RequestExecutor } from "../..";
import { ServerOperationExecutor } from "./OperationExecutor";

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

    public server(): ServerOperationExecutor {
        if (!this._serverOperationExecutor) {
            return this._serverOperationExecutor;
        } else {
            this._serverOperationExecutor = new ServerOperationExecutor(this._store);
            return this._serverOperationExecutor;
        }
    }

    public MaintenanceOperationExecutor forDatabase(String databaseName) {
        if (StringUtils.equalsIgnoreCase(this.databaseName, databaseName)) {
            return this;
        }

        return new MaintenanceOperationExecutor(store, databaseName);
    }

    public void send(IVoidMaintenanceOperation operation) {
        VoidRavenCommand command = operation.getCommand(requestExecutor.getConventions());
        requestExecutor.execute(command);
    }

    public <TResult> TResult send(IMaintenanceOperation<TResult> operation) {
        RavenCommand<TResult> command = operation.getCommand(requestExecutor.getConventions());
        requestExecutor.execute(command);
        return command.getResult();
    }

    public Operation sendAsync(IMaintenanceOperation<OperationIdResult> operation) {
        RavenCommand<OperationIdResult> command = operation.getCommand(requestExecutor.getConventions());

        requestExecutor.execute(command);
        return new Operation(requestExecutor, requestExecutor.getConventions(), command.getResult().getOperationId());
        //TBD pass changes as well
    }
}