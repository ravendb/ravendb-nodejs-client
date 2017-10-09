import {ILockCallback, ILockDoneCallback} from '../Typedef/LockCallbacks';
import * as BluebirdPromise from 'bluebird';
import * as AsyncLock from 'async-lock';
import * as uuid from 'uuid';

export class Lock {
  private _key: string;
  private static _lock: AsyncLock;

  protected get lock(): AsyncLock {
    const self: typeof Lock = <typeof Lock>this.constructor;

    if (!self._lock) {
      self._lock = new AsyncLock({Promise: BluebirdPromise});
    }
    
    return self._lock;
  }

  constructor(key) {
    this._key = key;
  }

  public static make(): Lock {
    const self: typeof Lock = <typeof Lock>this;

    return new self(uuid());
  }

  public acquire(wrapped: ILockCallback): BluebirdPromise<any>;
  public acquire(wrapped: ILockCallback, callback: (done?: ILockDoneCallback) => any): void;
  public acquire(wrapped: ILockCallback, callback?: (done?: ILockDoneCallback) => any): void | BluebirdPromise<any> {
    if ('function' !== (typeof callback)) {
      return <BluebirdPromise<any>>this.lock.acquire(this._key, wrapped);
    }
      
    this.lock.acquire(this._key, wrapped, callback);
  }
}