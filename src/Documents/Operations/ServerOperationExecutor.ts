import { IDisposable } from "../../Types/Contracts";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { IServerOperation, AwaitableServerOperation, OperationIdResult } from "./OperationAbstractions";
import { ClusterRequestExecutor } from "../../Http/ClusterRequestExecutor";
import { RavenCommand } from "../../Http/RavenCommand";
import { ServerWideOperationCompletionAwaiter } from "../../ServerWide/Operations/ServerWideOperationCompletionAwaiter";
import { getLogger } from "../../Utility/LogUtil";

const log = getLogger({ module: "ServerOperationExecutor" });
export class ServerOperationExecutor implements IDisposable {

    private _store: DocumentStoreBase;
    private _requestExecutor: ClusterRequestExecutor;

    public constructor(store: DocumentStoreBase) {
        this._store = store;
        this._requestExecutor = store.conventions.isDisableTopologyUpdates ?
                ClusterRequestExecutor.createForSingleNode(store.urls[0], { authOptions: store.authOptions }) :
                ClusterRequestExecutor.create(store.urls, store);

        store.once("afterDispose", 
            (callback) => { 
                log.info("Dispose request executor.");
                this._requestExecutor.dispose();
                callback();
            });
    }

    public send(operation: AwaitableServerOperation): Promise<ServerWideOperationCompletionAwaiter>;
    public send<TResult>(operation: IServerOperation<TResult>): Promise<TResult>;
    public send<TResult>(operation: AwaitableServerOperation | IServerOperation<TResult>)
        : Promise<ServerWideOperationCompletionAwaiter | TResult> {

        const command = operation.getCommand(this._requestExecutor.conventions);
        const result = Promise.resolve()
            .then(() => this._requestExecutor.execute(command as RavenCommand<TResult>))
            .then(() => {
                if (operation.resultType === "OperationId") {
                    const idResult = command.result as OperationIdResult;
                    const awaiter = new ServerWideOperationCompletionAwaiter(
                        this._requestExecutor, this._requestExecutor.conventions, idResult.operationId);
                    return awaiter;
                }

                return command.result as TResult;
            });

        return result;
    }

    public dispose(): void {
        this._requestExecutor.dispose();
    }
}
