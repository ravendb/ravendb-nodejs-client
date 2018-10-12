import { getError } from "../../src/Exceptions";

type valueResolver<T> = (val: T) => void;

export class AsyncQueue<T> {

    private _backingArray: T[] = [];
    private _promises: Array<valueResolver<T>> = [];

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

        const timeoutErr = getError(
            "TimeoutException", `Timeout exceeded waiting for element to arrive for ${timeout}.`);
        const timeoutPromise: Promise<T> = 
            new Promise((_, reject) => 
                setTimeout(() => 
                    reject(timeoutErr), timeout));
        const resultPromise: Promise<T> = 
            new Promise(resolve => this._promises.push(resolve));
        // element is not available - wait for it!
        return Promise.race([timeoutPromise, resultPromise]);
    }
}
