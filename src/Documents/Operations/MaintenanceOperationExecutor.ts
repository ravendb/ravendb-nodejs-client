import { OperationCompletionAwaiter } from "./OperationCompletionAwaiter.js";
import { DocumentStoreBase } from "../DocumentStoreBase.js";
import { IMaintenanceOperation, AwaitableMaintenanceOperation, OperationIdResult } from "./OperationAbstractions.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { ServerOperationExecutor } from "./ServerOperationExecutor.js";
import { throwError } from "../../Exceptions/index.js";
import { RequestExecutor } from "../../Http/RequestExecutor.js";
import { TypeUtil } from "../../Utility/TypeUtil.js";
import { StringUtil } from "../../Utility/StringUtil.js";
import { ClientShardHelper } from "../../Utility/ClientShardHelper.js";

export class MaintenanceOperationExecutor {

    private readonly _store: DocumentStoreBase;
    private _nodeTag: string;
    private _shardNumber: number;
    private readonly _databaseName: string;
    private _requestExecutor: RequestExecutor;
    private _serverOperationExecutor: ServerOperationExecutor;

    public constructor(store: DocumentStoreBase, databaseName?: string)
    public constructor(store: DocumentStoreBase, databaseName: string, nodeTag: string, shardNumber: number)
    public constructor(store: DocumentStoreBase, databaseName?: string, nodeTag?: string, shardNumber?: number) {
        this._store = store;
        this._databaseName = databaseName || store.database;
        this._nodeTag = nodeTag;
        this._shardNumber = shardNumber;
    }

    private get requestExecutor() {
        if (this._requestExecutor) {
            return this._requestExecutor;
        }

        this._requestExecutor = this._databaseName ? this._store.getRequestExecutor(this._databaseName) : null;
        return this.requestExecutor;
    }

    public get server(): ServerOperationExecutor {
        if (!this._serverOperationExecutor) {
            this._serverOperationExecutor = new ServerOperationExecutor(this._store);
        }

        return this._serverOperationExecutor;
    }

    public forDatabase(databaseName: string): MaintenanceOperationExecutor {
        if (this._databaseName
            && this._databaseName.toLowerCase() === (databaseName || "").toLowerCase()) {
            return this;
        }

        return new MaintenanceOperationExecutor(this._store, databaseName, this._nodeTag, this._shardNumber);
    }

    public forNode(nodeTag: string): MaintenanceOperationExecutor {
        if (StringUtil.equalsIgnoreCase(this._nodeTag, nodeTag)) {
            return this;
        }

        return new MaintenanceOperationExecutor(this._store, this._databaseName, nodeTag, this._shardNumber);
    }

    public forShard(shardNumber: number): MaintenanceOperationExecutor {
        this._assertDatabaseNameSet();

        const databaseName = ClientShardHelper.toDatabaseName(this._databaseName);
        const shardDatabaseName = ClientShardHelper.toShardName(databaseName, shardNumber);
        if (StringUtil.equalsIgnoreCase(this._databaseName, shardDatabaseName)) {
            return this;
        }

        return new MaintenanceOperationExecutor(this._store, shardDatabaseName, this._nodeTag, null);
    }

    public async send(operation: AwaitableMaintenanceOperation): Promise<OperationCompletionAwaiter>;
    public async send<TResult>(operation: IMaintenanceOperation<TResult>): Promise<TResult>;
    public async send<TResult>(
        operation: AwaitableMaintenanceOperation | IMaintenanceOperation<TResult>)
        : Promise<OperationCompletionAwaiter | TResult> {

        this._assertDatabaseNameSet();
        const command = operation.getCommand(this.requestExecutor.conventions);

        this.applyNodeTagAndShardNumberToCommandIfSet(command);

        await this.requestExecutor.execute(command as RavenCommand<TResult>);

        if (operation.resultType === "OperationId") {
            const idResult = command.result as OperationIdResult;
            return new OperationCompletionAwaiter(
                this.requestExecutor, this.requestExecutor.conventions, idResult.operationId,
                command.selectedNodeTag || idResult.operationNodeTag);
        }

        return command.result as TResult;
    }

    private _assertDatabaseNameSet(): void {
        if (!this._databaseName) {
            throwError("InvalidOperationException",
                "Cannot use maintenance without a database defined, did you forget to call forDatabase?");
        }
    }

    private applyNodeTagAndShardNumberToCommandIfSet(command: RavenCommand<unknown>) {
        if (this._nodeTag) {
            command.selectedNodeTag = this._nodeTag;
        }
        if (!TypeUtil.isNullOrUndefined(this._shardNumber)) {
            command.selectedShardNumber = this._shardNumber;
        }
    }
}
