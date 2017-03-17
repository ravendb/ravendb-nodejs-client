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
    if (!Lock._instance) {
      Lock._instance = new Lock();
    }

    return Lock._instance;
  }

  public acquireTagGenerator(tag: string, callback: ILockCallback): PromiseLike<any> {
    const key = StringUtil.format('lock:generator:tag:{0}', tag);

    return this._lock.acquire(key, callback);
  }

  public acquireKey(tag: string, range: HiloRangeValue, callback: ILockCallback, doneCallback: ILockDoneCallback): void {
    const key = StringUtil.format(
      'lock:tag:{0}:range:{1}:{2}', tag,
      range.minId, range.maxId, range.current
    );

    return this._lock.acquire(key, callback, doneCallback);
  }
}