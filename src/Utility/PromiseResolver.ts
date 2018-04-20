import * as BluebirdPromise from "bluebird";
import { TypeUtil } from "./TypeUtil";
import {
    AbstractCallback,
    EmptyCallback,
    EntitiesCountCallback
} from "../Types/Callbacks";
import { EntitiesCollectionObject } from "../Types";

export type PromiseResolve<T> = 
    (thenableOrResult?: 
        PromiseLike<T | EntitiesCollectionObject<T> | number> | T | EntitiesCollectionObject<T> | number) => void;
export type PromiseReject = (error: Error) => void;

export class PromiseResolver {
    public static resolve<T>(
        result?: T | EntitiesCollectionObject<T> | number,
        resolve?: PromiseResolve<T>,
        callback?:
            AbstractCallback<T> | AbstractCallback<EntitiesCollectionObject<T>> | EntitiesCountCallback | EmptyCallback)
        : T | EntitiesCollectionObject<T> | number | void {

        if (resolve) {
            resolve(result);
        }

        if (callback) {
            if (TypeUtil.isNumber(result)) {
                (callback as EntitiesCountCallback)(null, result as number);
                return result as number;
            } else if (TypeUtil.isObject(result)) {
                (callback as AbstractCallback<EntitiesCollectionObject<T>>)(
                    null, result as EntitiesCollectionObject<T>);
                return result as EntitiesCollectionObject<T>;
            } else if (TypeUtil.isNullOrUndefined(result)) {
                (callback as EmptyCallback)();
                return;
            } else {
                (callback as AbstractCallback<T>)(null, result as T);
                return result as T;
            }
        }
    }

    public static reject<T = void>(
        error: Error, reject?: PromiseReject, callback?: AbstractCallback<null>): BluebirdPromise.Thenable<T> {
        if (reject) {
            reject(error);
        }

        if (callback) {
            callback(error, null);
        }

        return BluebirdPromise.reject(error);
    }
}