import * as semaphore from "semaphore";
import * as BluebirdPromise from "bluebird";
import { IDisposable } from "../Types/Contracts";

export interface AcquireSemaphoreOptions { 
    timeout?: number;
}

export interface AcquiredSemaphoreContext extends IDisposable {
    promise: Promise<void>;
}

export function acquireSemaphore(
    sem: semaphore.Semaphore, semOpts?: AcquireSemaphoreOptions)
    : AcquiredSemaphoreContext {

    const acquiredObj = {
        acquired: false
    };
    const acquiredSemaphorePromise = 
        new BluebirdPromise.Promise<void>(resolve => {
            sem.take(() => {
                acquiredObj.acquired = true;
                resolve();
            });
        });

    let p = acquiredSemaphorePromise;
    if (semOpts && semOpts.timeout) {
        p = p.timeout(semOpts.timeout) as BluebirdPromise<void>;
    } 

    const releaseFunc = () => acquiredSemaphorePromise.then(() => sem.leave());

    const result = Promise.resolve<void>(p);
    return {
        dispose: releaseFunc,
        promise: result
    };
}
