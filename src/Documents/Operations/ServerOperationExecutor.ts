import { IDisposable } from "../../Types/Contracts";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { Todo } from "../../Types";
import { IServerOperation, AwaitableServerOperation } from "./OperationBase";
import { OperationCompletionAwaiter } from "./OperationCompletionAwaiter";

export class ServerOperationExecutor implements IDisposable {

    private _store: DocumentStoreBase;
    private _requestExecutor: Todo; // ClusterRequestExecutor;

    public constructor(store: DocumentStoreBase) {
        this._store = store;
        this._requestExecutor = store.conventions.isDisableTopologyUpdates ?
                ClusterRequestExecutor.createForSingleNode(store.urls[0], store.authOptions) :
                ClusterRequestExecutor.create(store.urls, store.authOptions);

        store.on("afterClose", 
            (sender, event) => this._requestExecutor.dispose());
    }

    public send(operation: AwaitableServerOperation): OperationCompletionAwaiter;
    public send<TResult>(operation: IServerOperation<TResult>): TResult;
    public send<TResult>(operation: AwaitableServerOperation | IServerOperation<TResult>)
        : OperationCompletionAwaiter | TResult {
        const command = operation.getCommand(this._requestExecutor.conventions);
    }

    public void send(IVoidServerOperation operation) {
        VoidRavenCommand command = operation.getCommand(requestExecutor.getConventions());
        requestExecutor.execute(command);
    }

    public <TResult> TResult send(IServerOperation<TResult> operation) {
        RavenCommand<TResult> command = operation.getCommand(requestExecutor.getConventions());
        requestExecutor.execute(command);

        return command.getResult();
    }

    public Operation sendAsync(IServerOperation<OperationIdResult> operation) {
        RavenCommand<OperationIdResult> command = operation.getCommand(requestExecutor.getConventions());

        requestExecutor.execute(command);
        return new ServerWideOperation(requestExecutor, requestExecutor.getConventions(), command.getResult().getOperationId());
    }

    @Override
    public void close() {
        requestExecutor.close();
    }
}
