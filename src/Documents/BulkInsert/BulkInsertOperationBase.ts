import { throwError } from "../../Exceptions/index.js";

export abstract class BulkInsertOperationBase<T> {

    private _streamEnsured: boolean = false;
    protected _bulkInsertExecuteTask: Promise<any>;
    protected _bulkInsertExecuteTaskErrored = false;
    protected _operationId = -1;

    public abstract store(entity: T, id: string): Promise<void>;

    protected get _isReadyForStore(): boolean {
        return this._streamEnsured && !this._bulkInsertExecuteTaskErrored;
    }

    protected async _executeBeforeStore() {
        if (!this._streamEnsured) {
            await this._waitForId();
            await this._ensureStream();

            this._streamEnsured = true;
        }

        if (this._bulkInsertExecuteTaskErrored) {
            try {
                await this._bulkInsertExecuteTask;
            } catch (error) {
                await this._throwBulkInsertAborted(error);
            }
        }
    }

    protected async _throwBulkInsertAborted(e: Error, flushEx: Error = null) {
        let errorFromServer: Error;
        try {
            errorFromServer = await this._getExceptionFromOperation();
        } catch {
            // server is probably down, will propagate the original exception
        }
        //TODO: use flushEx variable

        if (errorFromServer) {
            throw errorFromServer;
        }

        throwError("BulkInsertAbortedException", "Failed to execute bulk insert", e);
    }
    protected abstract _waitForId(): Promise<void>;
    protected abstract _ensureStream(): Promise<void>;

    protected abstract _getExceptionFromOperation(): Promise<Error>;

    public abstract abort(): Promise<void>;
}
