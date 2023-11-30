import { getError } from "../../src/Exceptions";

type valueResolver<T> = (val: T) => void;

export class AsyncQueue<T> {

    private _backingArray: T[] = [];
    private _promises: valueResolver<T>[] = [];

    public push(item: T) {
        const waiter = this._promises.shift();
        if (waiter) {
            // there is item which is waiting - resolve
            waiter(item);
        } else {
            // no one is waiting - push to ready list
            this._backingArray.push(item);
        }
    }

    public async poll(timeout: number): Promise<T> {
        const head = this._backingArray.shift();

        if (head) {
            return head;
        }

        // keep reference to resolve function - if timeout finishes first, we don't want to wait for value!
        // eslint-disable-next-line @typescript-eslint/ban-types
        let resolveToDelete: Function;

        let timeoutHandle: ReturnType<typeof setTimeout>;
        const timeoutErr = getError(
            "TimeoutException", `Timeout exceeded waiting for element to arrive for ${timeout}.`);
        const timeoutPromise: Promise<T> =
            new Promise((_, reject) =>
                timeoutHandle = setTimeout(() => {
                    reject(timeoutErr);

                    // we don't want to wait for value
                    if (resolveToDelete) {
                        const index = this._promises.findIndex(x => x === resolveToDelete);
                        if (index !== -1) {
                            this._promises.splice(index, 1);
                        }
                    }
                }, timeout));
        const resultPromise: Promise<T> =
            new Promise(resolve => {
                resolveToDelete = resolve;
                this._promises.push(resolve);
            });

        // when result comes first - don't mark item for deletion
        resultPromise.then(() => {
            clearTimeout(timeoutHandle);
            resolveToDelete = null;
        });

        // element is not available - wait for it!
        return Promise.race([timeoutPromise, resultPromise]);
    }
}
