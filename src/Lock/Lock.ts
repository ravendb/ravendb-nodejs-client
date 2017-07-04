import {StringUtil} from '../Utility/StringUtil';
import {ILockCallback, ILockDoneCallback} from './LockCallbacks';
import {HiloRangeValue} from '../Hilo/HiloRangeValue';
import * as AsyncLock from 'async-lock';

export class Lock {
  private static _instance: Lock = null;
  private _lock: AsyncLock;

  constructor() {
    this._lock = new AsyncLock();
  }

  public static getInstance(): Lock {
    if (!this._instance) {
      this._instance = new Lock();
    }

    return this._instance;
  }

  public acquireTagGenerator(tag: string, callback: ILockCallback): PromiseLike<any> {
    const key: string = StringUtil.format('lock:generator:tag:{0}', tag);

    return this._lock.acquire(key, callback);
  }

  public acquireIdGenerator(tag: string, range: HiloRangeValue, callback: ILockCallback, doneCallback: ILockDoneCallback): void {
    const key: string = StringUtil.format(
      'lock:tag:{0}:range:{1}:{2}', tag,
      range.minId, range.maxId, range.current
    );

    return this._lock.acquire(key, callback, doneCallback);
  }

  public acquireTopologyUpdate(url: string, database: string, callback: ILockCallback): PromiseLike<any> {
    const key: string = StringUtil.format(
      'lock:topology:url:{0}:database:{1}',
      url, database
    );

    return this._lock.acquire(key, callback);
  }

  public acquireNodeStatus(url: string, database: string, callback: ILockCallback): PromiseLike<any> {
    const key: string = StringUtil.format(
      'lock:update:failed:node:status:url:{0}:database:{1}',
      url, database
    );

    return this._lock.acquire(key, callback);
  }
}