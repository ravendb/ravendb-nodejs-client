import { GetOperationStateCommand } from "./GetOperationStateOperation.js";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand.js";
import { throwError } from "../../Exceptions/index.js";
import { OperationExceptionResult } from "./OperationAbstractions.js";
import { ExceptionDispatcher } from "../../Exceptions/index.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { RequestExecutor } from "../../Http/RequestExecutor.js";
import { delay } from "../../Utility/PromiseUtil.js";
import { KillOperationCommand } from "../Commands/KillOperationCommand.js";
import { IOperationResult } from "./IOperationResult.js";

type OperationStatus = "Completed" | "Canceled" | "Faulted";

export class OperationCompletionAwaiter {

    private _requestExecutor: RequestExecutor;
    private readonly _conventions: DocumentConventions;
    private readonly _id: number;
    private _nodeTag: string;

    public get id(): number {
        return this._id;
    }

    public constructor(requestExecutor: RequestExecutor, conventions: DocumentConventions, id: number, nodeTag?: string) {
        this._requestExecutor = requestExecutor;
        this._conventions = conventions;
        this._id = id;
        this._nodeTag = nodeTag;
    }

    private async _fetchOperationStatus(): Promise<IRavenResponse> {
        const command: RavenCommand<IRavenResponse> = this._getOperationStateCommand(this._conventions, this._id, this._nodeTag);
        await this._requestExecutor.execute(command);
        return command.result;
    }

    protected _getOperationStateCommand(conventions: DocumentConventions, id: number, nodeTag?: string): RavenCommand<IRavenResponse> {
        return new GetOperationStateCommand(this._id, nodeTag);
    }

    get nodeTag() {
        return this._nodeTag;
    }

    set nodeTag(nodeTag: string) {
        this._nodeTag = nodeTag;
    }

    /**
     * Polls the operation state until the operation completes and returns its result.
     * @param timeout Milliseconds to wait before a TimeoutException is thrown. The operation keeps running on the server.
     */
    public async waitForCompletion<TResult extends IOperationResult = IOperationResult>(timeout?: number): Promise<TResult> {
        if (timeout != null && !(timeout >= 0)) {
            throwError("InvalidArgumentException", "Timeout must be a non-negative number of milliseconds.");
        }

        const deadline = timeout == null ? null : Date.now() + timeout;

        for (;;) {
            const operationStatusResult = await this._fetchOperationStatus();
            const operationStatus = operationStatusResult.status as OperationStatus;
            switch (operationStatus) {
                case "Completed": {
                    return operationStatusResult.result;
                }
                case "Canceled": {
                    throwError("OperationCanceledException",
                        `Operation of ID ${this._id} has been canceled.`);
                    break;
                }
                case "Faulted": {
                    const faultResult: OperationExceptionResult = operationStatusResult.result;
                    const errorSchema = Object.assign({}, faultResult, {url: this._requestExecutor.getUrl()});
                    throw ExceptionDispatcher.get(errorSchema, faultResult.statusCode);
                }
            }

            if (deadline !== null && Date.now() >= deadline) {
                throwError("TimeoutException", `Did not get a reply for operation '${this._id}'.`);
            }

            await delay(deadline === null ? 500 : Math.min(500, deadline - Date.now()));
        }
    }

    protected _getKillOperationCommand(id: number, nodeTag: string): RavenCommand<void> {
        return new KillOperationCommand(id, nodeTag);
    }

    public async kill() {
        const command = this._getKillOperationCommand(this._id, this.nodeTag);

        await this._requestExecutor.execute(command);
    }
}
