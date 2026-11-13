import { EventEmitter } from "node:events";
import { GetOperationStateCommand } from "./GetOperationStateOperation.js";
import { RavenCommand, IRavenResponse } from "../../Http/RavenCommand.js";
import { throwError, getError } from "../../Exceptions/index.js";
import { OperationExceptionResult } from "./OperationAbstractions.js";
import { ExceptionDispatcher } from "../../Exceptions/index.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { RequestExecutor } from "../../Http/RequestExecutor.js";
import { delay } from "../../Utility/PromiseUtil.js";
import { KillOperationCommand } from "../Commands/KillOperationCommand.js";
import { IOperationResult } from "./IOperationResult.js";
import { IOperationProgress } from "./IOperationProgress.js";
import { OperationState } from "./OperationState.js";
import { IDatabaseChanges } from "../Changes/IDatabaseChanges.js";
import { OperationStatusChange } from "../Changes/OperationStatusChange.js";
import { IChangesObservable } from "../Changes/IChangesObservable.js";

export class OperationCompletionAwaiter {

    private _requestExecutor: RequestExecutor;
    private readonly _conventions: DocumentConventions;
    private readonly _id: number;
    private _nodeTag: string;
    private readonly _changes: () => IDatabaseChanges;
    private readonly _emitter = new EventEmitter();

    public get id(): number {
        return this._id;
    }

    /**
     * @param changes Changes API of the database and node that run the operation. Without it the status is always polled.
     */
    public constructor(requestExecutor: RequestExecutor, conventions: DocumentConventions, id: number, nodeTag?: string,
                       changes?: () => IDatabaseChanges) {
        this._requestExecutor = requestExecutor;
        this._conventions = conventions;
        this._id = id;
        this._nodeTag = nodeTag;
        this._changes = changes;
    }

    /**
     * Raised with the server progress while the operation is waited for and still running.
     */
    public on(event: "progress", handler: (progress: IOperationProgress) => void): this {
        this._emitter.on(event, handler);
        return this;
    }

    public off(event: "progress", handler: (progress: IOperationProgress) => void): this {
        this._emitter.off(event, handler);
        return this;
    }

    private async _fetchOperationStatus(throwOnNoStatus = true): Promise<OperationState | null> {
        // the server may not have registered the operation yet (e.g. smuggler), so retry a few times
        for (let attempt = 0; attempt < 10; attempt++) {
            const command: RavenCommand<IRavenResponse> = this._getOperationStateCommand(this._conventions, this._id, this._nodeTag);
            await this._requestExecutor.execute(command);

            if (command.result) {
                return command.result as OperationState;
            }

            await delay(500);
        }

        if (throwOnNoStatus) {
            throwError("InvalidOperationException",
                `Could not fetch state of operation '${this._id}' from node '${this._nodeTag}'.`);
        }

        return null;
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
     * Waits until the operation completes and returns its result.
     * @param timeout Milliseconds to wait before a TimeoutException is thrown. The operation keeps running on the server.
     */
    public async waitForCompletion<TResult extends IOperationResult = IOperationResult>(timeout?: number): Promise<TResult> {
        if (timeout != null && !(timeout >= 0)) {
            throwError("InvalidArgumentException", "Timeout must be a non-negative number of milliseconds.");
        }

        const deadline = timeout == null ? null : Date.now() + timeout;

        if (this._changes && this._conventions.operationStatusFetchMode === "ChangesApi") {
            return await this._waitWithChanges(deadline) as TResult;
        }

        return await this._waitWithPolling(deadline) as TResult;
    }

    private async _waitWithPolling(deadline: number | null): Promise<IOperationResult> {
        for (;;) {
            const completion = this._processState(await this._fetchOperationStatus());
            if (completion) {
                return completion.result;
            }

            if (deadline !== null && Date.now() >= deadline) {
                this._throwTimeout();
            }

            await delay(deadline === null ? 500 : Math.min(500, deadline - Date.now()));
        }
    }

    private _waitWithChanges(deadline: number | null): Promise<IOperationResult> {
        const changes = this._changes();

        return new Promise<IOperationResult>((resolve, reject) => {
            let settled = false;
            let notified = false;
            let timer: ReturnType<typeof setTimeout>;
            let observable: IChangesObservable<OperationStatusChange>;

            const settle = (complete: () => void) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timer);
                observable?.off("data", onData);
                observable?.off("error", onError);
                changes.off("connectionStatus", onConnectionStatus);
                complete();
            };

            const onState = (state: OperationState) => {
                try {
                    const completion = this._processState(state);
                    if (completion) {
                        settle(() => resolve(completion.result));
                    }
                } catch (err) {
                    settle(() => reject(err));
                }
            };

            const fetchState = async (afterSubscribing: boolean) => {
                try {
                    const state = await this._fetchOperationStatus(afterSubscribing);
                    if (!state || settled) {
                        return;
                    }

                    // a notification is newer than a state fetched while it arrived
                    if (!(afterSubscribing && notified && state.status === "InProgress")) {
                        onState(state);
                    }
                } catch (err) {
                    settle(() => reject(err));
                }
            };

            const onData = (change: OperationStatusChange) => {
                notified = true;
                onState(change.state);
            };

            const onError = (err: Error) => settle(() => reject(err));

            const onConnectionStatus = () => {
                if (changes.connected) {
                    void fetchState(false);
                }
            };

            if (deadline !== null) {
                timer = setTimeout(() => settle(() => reject(this._timeoutError())), Math.max(0, deadline - Date.now()));
            }

            changes.ensureConnectedNow()
                .then(() => {
                    if (settled) {
                        return;
                    }

                    observable = changes.forOperationId(this._id);
                    observable.on("data", onData);
                    observable.on("error", onError);
                    changes.on("connectionStatus", onConnectionStatus);

                    // the operation was started before we subscribed, so it may have finished already
                    return observable.ensureSubscribedNow().then(() => fetchState(true));
                })
                .catch(onError);
        });
    }

    private _processState(state: OperationState): { result: IOperationResult } | null {
        switch (state.status) {
            case "Completed": {
                return { result: state.result };
            }
            case "Canceled": {
                throwError("OperationCanceledException",
                    `Operation of ID ${this._id} has been canceled.`);
                break;
            }
            case "Faulted": {
                const faultResult = state.result as unknown as OperationExceptionResult;
                const errorSchema = Object.assign({}, faultResult, {url: this._requestExecutor.getUrl()});
                throw ExceptionDispatcher.get(errorSchema, faultResult.statusCode);
            }
            case "InProgress": {
                if (state.progress) {
                    this._emitter.emit("progress", state.progress);
                }
            }
        }

        return null;
    }

    private _timeoutError(): Error {
        return getError("TimeoutException", `Did not get a reply for operation '${this._id}'.`);
    }

    private _throwTimeout(): never {
        throw this._timeoutError();
    }

    protected _getKillOperationCommand(id: number, nodeTag: string): RavenCommand<void> {
        return new KillOperationCommand(id, nodeTag);
    }

    public async kill() {
        const command = this._getKillOperationCommand(this._id, this.nodeTag);

        await this._requestExecutor.execute(command);
    }
}
