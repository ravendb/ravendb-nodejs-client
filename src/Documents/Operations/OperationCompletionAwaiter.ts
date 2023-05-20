import { GetOperationStateCommand } from "./GetOperationStateOperation";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { OperationExceptionResult } from "./OperationAbstractions";
import { ExceptionDispatcher } from "../../Exceptions";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { delay } from "../../Utility/PromiseUtil";

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

    public waitForCompletion(): Promise<void> {
        const operationStatusPolling = () => {
            return Promise.resolve()
                .then(() => this._fetchOperationStatus())
                .then((operationStatusResult) => {
                    const operationStatus = operationStatusResult.status as OperationStatus;
                    switch (operationStatus) {
                        case "Completed":
                            return;
                        case "Canceled":
                            throwError("OperationCanceledException",
                                `Operation of ID ${this._id} has been canceled.`);
                            break;
                        case "Faulted": {
                            const faultResult: OperationExceptionResult = operationStatusResult.result;
                            const errorSchema = Object.assign({}, faultResult, {url: this._requestExecutor.getUrl()});
                            throw ExceptionDispatcher.get(errorSchema, faultResult.statusCode);
                        }
                    }

                    return delay(500)
                        .then(() => operationStatusPolling());
                });
        };

        return Promise.resolve(operationStatusPolling());
    }
}
