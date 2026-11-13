import { OperationCompletionAwaiter } from "./OperationCompletionAwaiter.js";
import {
    IOperation,
    AwaitableOperation,
    OperationIdResult
} from "./OperationAbstractions.js";
import { RequestExecutor } from "../../Http/RequestExecutor.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { throwError } from "../../Exceptions/index.js";
import { DocumentStoreBase } from "../DocumentStoreBase.js";
import { SessionInfo } from "../Session/IDocumentSession.js";
import { PatchOperation, PatchOperationResult } from "./PatchOperation.js";
import { DocumentType } from "../DocumentAbstractions.js";
import { PatchResult } from "./PatchResult.js";
import { IDocumentStore } from "../IDocumentStore.js";
import { StatusCodes } from "../../Http/StatusCode.js";
import { StringUtil } from "../../Utility/StringUtil.js";

export class OperationExecutor {

    private readonly _store: IDocumentStore;
    private readonly _databaseName: string;
    private _requestExecutor: RequestExecutor;

    public constructor(store: DocumentStoreBase);
    public constructor(store: IDocumentStore, databaseName?: string);
    public constructor(store: DocumentStoreBase, databaseName?: string) {
        this._store = store;
        this._databaseName = databaseName ?? store.database;
        if (!StringUtil.isNullOrWhitespace(this._databaseName)) {
            this._requestExecutor = store.getRequestExecutor(this._databaseName);
        } else {
            throwError("InvalidOperationException",
                "Cannot use operations without a database defined, did you forget to call forDatabase?");
        }
    }

    private getRequestExecutor() {
        if (this._requestExecutor) {
            return this._requestExecutor;
        }

        this._requestExecutor = this._databaseName ? this._store.getRequestExecutor(this._databaseName) : null;
        return this._requestExecutor;
    }

    public forDatabase(databaseName: string): OperationExecutor {
        if (!databaseName) {
            throwError("InvalidArgumentException", `Argument 'databaseName' is invalid: ${databaseName}.`);
        }
        if (this._databaseName.toLowerCase() === databaseName.toLowerCase()) {
            return this;
        }

        return new OperationExecutor(
            this._store as IDocumentStore, 
            databaseName);
    }

    public async send(operation: AwaitableOperation): Promise<OperationCompletionAwaiter>;
    public async send(operation: AwaitableOperation, sessionInfo?: SessionInfo): Promise<OperationCompletionAwaiter>;
    public async send<TResult extends object>(
        patchOperation: PatchOperation): Promise<PatchOperationResult<TResult>>;
    public async send<TResult extends object>(
        patchOperation: PatchOperation,
        sessionInfo: SessionInfo): Promise<PatchOperationResult<TResult>>;
    public async send<TResult extends object>(
        patchOperation: PatchOperation,
        sessionInfo: SessionInfo,
        resultType: DocumentType<TResult>): Promise<PatchOperationResult<TResult>>;
    public async send<TResult>(operation: IOperation<TResult>): Promise<TResult>;
    public async send<TResult>(
        operation: IOperation<TResult>,
        sessionInfo?: SessionInfo): Promise<TResult>;
    public async send<TResult extends object>(
        operation: AwaitableOperation | IOperation<TResult>,
        sessionInfo?: SessionInfo,
        documentType?: DocumentType<TResult>)
        : Promise<OperationCompletionAwaiter | TResult | PatchOperationResult<TResult>> {

        const command =
            operation.getCommand(this._store, this.getRequestExecutor().conventions, this.getRequestExecutor().cache);

        await this.getRequestExecutor().execute(command as RavenCommand<TResult>, sessionInfo);

        if (operation.resultType === "OperationId") {
            const idResult = command.result as OperationIdResult;
            const nodeTag = command.selectedNodeTag || idResult.operationNodeTag;
            return new OperationCompletionAwaiter(
                this.getRequestExecutor(),
                this.getRequestExecutor().conventions,
                idResult.operationId,
                nodeTag,
                () => this._store.changes(this._databaseName, nodeTag));

        } else if (operation.resultType === "PatchResult") {
            const patchOperationResult = new PatchOperationResult<TResult>();
            if (command.statusCode === StatusCodes.NotModified) {
                patchOperationResult.status = "NotModified";
                return patchOperationResult;
            }

            if (command.statusCode === StatusCodes.NotFound) {
                patchOperationResult.status = "DocumentDoesNotExist";
                return patchOperationResult;
            }

            const patchResult = command.result as any as PatchResult;
            patchOperationResult.status = patchResult.status;
            const { conventions } = this.getRequestExecutor();
            conventions.tryRegisterJsType(documentType);
            const entityType = conventions.getJsTypeByDocumentType(documentType);
            patchOperationResult.document = conventions.deserializeEntityFromJson(
                entityType, patchResult.modifiedDocument) as TResult;
            return patchOperationResult;
        }

        return command.result as TResult;
    }
}
