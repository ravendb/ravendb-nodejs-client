import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {AbstractHiloKeyGenerator} from './AbstractHiloKeyGenerator';
import {HiloRangeValue} from './HiloRangeValue';
import {FetchConcurrencyException} from '../Database/DatabaseExceptions';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {DocumentID} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import {StringUtil} from '../Utility/StringUtil';
import {PromiseResolver, PromiseResolve, PromiseReject} from '../Utility/PromiseResolver';
import {HiloNextCommand} from './Commands/HiloNextCommand';
import {HiloReturnCommand} from './Commands/HiloReturnCommand';
import * as Promise from 'bluebird';
import * as AsyncLock from 'async-lock';
import * as moment from 'moment';

export class HiloKeyGenerator extends AbstractHiloKeyGenerator implements IHiloKeyGenerator {
  private _lastRangeAt: Date;
  private _range: HiloRangeValue;
  private _identityPartsSeparator: string;
  private _lock: AsyncLock;
  private _prefix?: string = null;
  private _lastBatchSize: number = 0;

  constructor(store: IDocumentStore, dbName?: string, tag?: string) {
    super(store, dbName, tag);

    this._lastRangeAt = moment([1, 1, 1]).toDate();
    this._range = new HiloRangeValue();
    this._identityPartsSeparator = this.conventions.identityPartsSeparator;
    this._lock = new AsyncLock();
  }

  public generateDocumentKey(callback?: IDCallback): Promise<DocumentID> {
    return new Promise<DocumentID>((resolve, reject) => {
      this.tryRequestNextRange(resolve, reject, callback);
    });
  }

  public returnUnusedRange(): void {
    const range = this._range;

    this.store.requestsExecutor.execute(new HiloReturnCommand(
      this.tag, range.current, range.maxId
    ));
  }

  protected getNextRange(): Promise<HiloRangeValue> {
    return this.store.requestsExecutor.execute(new HiloNextCommand(
      this.tag, this._lastBatchSize, this._lastRangeAt,
      this._identityPartsSeparator, this._range.maxId
    ))
    .then((response: Object) => {
      this._prefix = response['prefix'];
      this._lastBatchSize = response['last_size'];
      this._lastRangeAt = moment(response['last_range_at'], 'YYYY-MM-DDTHH:mm:ss.SSS').toDate();

      return new HiloRangeValue(response['low'], response['high']);
    });
  }

  protected tryRequestNextRange(resolve: PromiseResolve<number>, reject: PromiseReject, callback?: IDCallback): void {
    this._lock.acquire(
      StringUtil.format('lock:tag:{0}:range:{1}:{2}',
      this.tag, this._range.minId, this._range.maxId
    ), (done) => {
      this._range.increment();
      this.getNextRange()
        .then((range: HiloRangeValue) => done(null, range))
        .catch((error: Error) => done(error));
    }, (result?: HiloRangeValue, error?: Error) => {
      if (result) {
        PromiseResolver.resolve<number>(result.current, resolve, callback);
      } else if (!(error instanceof FetchConcurrencyException)) {
        PromiseResolver.reject(error, reject, callback);
      } else {
        this.tryRequestNextRange(resolve, reject, callback);
      }
    });
  }
}
