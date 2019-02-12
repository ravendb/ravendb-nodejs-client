import * as semaphore from "semaphore";
import { IDisposable } from "../Types/Contracts";
import { AsyncTimeout } from "./PromiseUtil";
import { getError } from "../Exceptions";

export interface AcquireSemaphoreOptions {
    timeout?: number;
    contextName?: string;
}

export interface SemaphoreAcquisitionContext extends IDisposable {
    promise: Promise<void>;
}

class SemaphoreAcquisition implements SemaphoreAcquisitionContext {

    private _acquired: boolean;
    private _disposed: boolean = false;
    private _timeout?: AsyncTimeout; 

    private _sem: semaphore.Semaphore;
    private _promise: Promise<void>;

    public get promise() {
        return this._promise;
    }

    private _isTimedOut() {
        return this._timeout && this._timeout.timedOut;
    }

    public constructor(sem: semaphore.Semaphore, semOpts?: AcquireSemaphoreOptions) {
        const contextName = semOpts ? semOpts.contextName : "";

        if (semOpts && semOpts.timeout) {
            const timedOutOpName = contextName ? `WAIT_FOR_SEM_${contextName}` : null;
            this._timeout = new AsyncTimeout(semOpts.timeout, timedOutOpName);
        }
        
        this._acquired = false;
        this._sem = sem;

        this._initialize();
    }

    private _initialize() {
        const sem = this._sem;
        const semAcquired =
            new Promise<void>((resolve, reject) => {
                sem.take(() => {

                    if (this._disposed || this._isTimedOut()) {
                        // when we finally got here after timeout or disposal
                        // need to release it anyway
                        sem.leave();
                        reject(getError(
                            "InvalidOperationException",
                            "Semaphore acquire timed out or was disposed."));
                        return;
                    }

                    this._acquired = true;
                    resolve();
                });
            });

        let resultPromise = semAcquired;

        if (this._timeout) {
            resultPromise = Promise.race([ 
                semAcquired, 
                this._timeout.promise 
            ])
            .then(() => this._timeout.cancel());
        }

        this._promise = resultPromise;
    }

    public dispose() {
        if (this._disposed) {
            return;
        }

        this._disposed = true;

        if (this._timeout) {
            this._timeout.cancel();
        }

        if (!this._acquired) {
            return;
        }

        this._sem.leave();

        this._acquired = false;
    }

}

export function acquireSemaphore(
    sem: semaphore.Semaphore, semOpts?: AcquireSemaphoreOptions)
    : SemaphoreAcquisitionContext {
    return new SemaphoreAcquisition(sem, semOpts);
}
