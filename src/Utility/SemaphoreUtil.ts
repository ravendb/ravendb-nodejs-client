import * as semaphore from "semaphore";
import * as BluebirdPromise from "bluebird";
import { IDisposable } from "../Types/Contracts";
import { getLogger } from "../Utility/LogUtil";

const log = getLogger({ module: "semaphore-util" });

export interface AcquireSemaphoreOptions { 
    timeout?: number;
    contextName?: string; 
}

export interface AcquiredSemaphoreContext extends IDisposable {
    promise: Promise<void>;
}

export function acquireSemaphore(
    sem: semaphore.Semaphore, semOpts?: AcquireSemaphoreOptions)
    : AcquiredSemaphoreContext {

    const contextName = semOpts ? semOpts.contextName : "";
    log.info(`Attempting to acquire semaphore ${contextName}`);

    const acquiredObj = {
        acquired: false
    };
    const acquiredSemaphorePromise = 
        new BluebirdPromise.Promise<void>(resolve => {
            sem.take(() => {
                log.info(`Acquired semaphore ${contextName}`);
                acquiredObj.acquired = true;
                resolve();
            });
        });

    let p = acquiredSemaphorePromise;
    if (semOpts && semOpts.timeout) {
        p = p.timeout(semOpts.timeout) as BluebirdPromise<void>;
    } 

    const releaseFunc = () => { 
        acquiredSemaphorePromise
            .then(() => sem.leave())
            .finally(() => {
                log.info(`Released semaphore ${contextName}`);
            });
    }

    const result = Promise.resolve<void>(p);
    return {
        dispose: releaseFunc,
        promise: result
    };
}
