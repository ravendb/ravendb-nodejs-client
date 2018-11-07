import * as BluebirdPromise from "bluebird";
import { AbstractCallback } from "./../Types/Callbacks";
import { VError } from "verror";
import { getError } from "../Exceptions";

export interface IDefer<TResult> {
    resolve: (value: TResult) => void;
    reject: (error: any) => void;
    promise: BluebirdPromise<TResult>;
}

export function raceToResolution<TResult>(
    promises: Array<BluebirdPromise<TResult>>,
    onErrorCallback?: (err) => void): BluebirdPromise<TResult> {

    // There is no way to know which promise is rejected.
    // So we map it to a new promise to return the index when it fails
    const indexPromises = promises.map((p, index) =>
        p.catch(() => {
            throw index;
        }));

    return BluebirdPromise.race(indexPromises).catch(index => {
        // The promise has rejected, remove it from the list of promises and just continue the race.
        const p = promises.splice(index, 1)[0];
        p.catch(err => {
            if (onErrorCallback) {
                onErrorCallback(err);
            }
        });
        return raceToResolution(promises);
    });
}

export function passResultToCallback<T>(p: Promise<T>, callback: AbstractCallback<T>): void {
    if (!callback) {
        return;
    }

    p.then(result => callback(null, result), err => callback(err));
}

export function defer<T>(): IDefer<T> {
    let resolve: (value: T) => void;
    let reject: (error: any) => void;
    const promise = new BluebirdPromise<T>(function () {
        resolve = arguments[0];
        reject = arguments[1];
    });
    return {
        resolve,
        reject,
        promise
    };
}

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function timeout(ms: number) {
    return new Promise(
        reject => 
            setTimeout(() => 
                reject(getError("TimeoutException", `Timeout after ${ms} ms.`)), ms));
}
