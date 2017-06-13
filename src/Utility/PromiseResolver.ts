import {AbstractCallback, EmptyCallback, EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from './Callbacks';
import {TypeUtil} from "./TypeUtil";
import * as BluebirdPromise from "bluebird";

export type PromiseResolve<T> = (thenableOrResult?: BluebirdPromise.Thenable<T | T[] | number> | T | T[] | number) => void;
export type PromiseReject = (error: Error) => void;

export class PromiseResolver {
  public static resolve<T>(result?: T | T[] | number, resolve?: PromiseResolve<T>, callback?: EntityCallback<T> | EntitiesArrayCallback<T> | EntitiesCountCallback | EmptyCallback): void {
    if (resolve) {
      resolve(result);
    }

    if (callback) {
      if (TypeUtil.isNumber(result)) {
        (callback as EntitiesCountCallback)(result as number);
      } else if (TypeUtil.isArray(result)) {
        (callback as EntitiesArrayCallback<T>)(result as T[]);
      } else if (TypeUtil.isNone(result)) {
        (callback as EmptyCallback)();
      } else {
        (callback as EntityCallback<T>)(result as T);
      }
    }
  }

  public static reject(error: Error, reject?: PromiseReject, callback?: AbstractCallback<null>): void {
    if (reject) {
      reject(error);
    }

    if (callback) {
      callback(null, error);
    }
  }
}