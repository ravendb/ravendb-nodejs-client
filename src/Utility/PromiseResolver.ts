import {AbstractCallback, EntityCallback, EntitiesArrayCallback, EntitiesCountCallback} from './Callbacks';
import {Thenable} from 'bluebird';

export type PromiseResolve<T> = (thenableOrResult?: Thenable<T> | T | T[] | number) => void;
export type PromiseReject = (error: Error) => void;

export class PromiseResolver {
  public static resolve<T>(result: T | T[] | number, resolve: PromiseResolve<T>, callback?: EntityCallback<T> | EntitiesArrayCallback<T> | EntitiesCountCallback) {
    resolve(result);

    if (callback) {
      if ("number" == (typeof result)) {
        (callback as EntitiesCountCallback)(result as number);
      } else if (Array.isArray(result)) {
        (callback as EntitiesArrayCallback<T>)(result as T[]);
      } else {
        (callback as EntityCallback<T>)(result as T);
      }
    }
  }

  public static reject(error: Error, reject: PromiseReject, callback?: AbstractCallback<null>) {
    reject(error);

    if (callback) {
      callback(null, error);
    }
  }
}