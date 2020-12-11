import { OperationCompletionAwaiter } from "./OperationCompletionAwaiter";
import * as BluebirdPromise from "bluebird";
import {
    IOperation,
    AwaitableOperation,
    OperationIdResult
} from "./OperationAbstractions";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { DocumentStoreBase } from "../DocumentStoreBase";
import { SessionInfo } from "../Session/IDocumentSession";
import { PatchOperation, PatchOperationResult } from "./PatchOperation";
import { DocumentType } from "../DocumentAbstractions";
import { PatchResult } from "./PatchResult";
import { IDocumentStore } from "../IDocumentStore";
import { StatusCodes } from "../../Http/StatusCode";

export class OperationExecutor {

    private readonly _store: IDocumentStore;
    private readonly _databaseName: string;
    private readonly _requestExecutor: RequestExecutor;

    public constructor(store: DocumentStoreBase);
    public constructor(store: IDocumentStore, databaseName?: string);
    public constructor(store: DocumentStoreBase, databaseName?: string) {
        this._store = store;
        this._databaseName = databaseName ? databaseName : store.database;
        if (this._databaseName) {
            this._requestExecutor = store.getRequestExecutor(this._databaseName);
        } else {
            throwError("InvalidOperationException",
                "Cannot use operations without a database defined, did you forget to call forDatabase?");
        }
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
            operation.getCommand(this._store, this._requestExecutor.conventions, this._requestExecutor.cache);

        await this._requestExecutor.execute(command as RavenCommand<TResult>, sessionInfo);

        const result = BluebirdPromise.resolve()
            .then(() => {
                if (operation.resultType === "OperationId") {
                    const idResult = command.result as OperationIdResult;
                    return new OperationCompletionAwaiter(
                        this._requestExecutor,
                        this._requestExecutor.conventions,
                        idResult.operationId,
                        command.selectedNodeTag || idResult.operationNodeTag);

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
                    const { conventions } = this._requestExecutor;
                    conventions.tryRegisterJsType(documentType);
                    const entityType = conventions.getJsTypeByDocumentType(documentType);
                    patchOperationResult.document = conventions.deserializeEntityFromJson(
                        entityType, patchResult.modifiedDocument) as TResult;
                    return patchOperationResult;
                }

                return command.result as TResult;
            });

        return Promise.resolve(result);
    }
}
