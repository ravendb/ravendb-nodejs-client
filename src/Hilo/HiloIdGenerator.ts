import {IHiloIdGenerator} from './IHiloIdGenerator';
import {AbstractHiloIdGenerator} from './AbstractHiloIdGenerator';
import {HiloRangeValue} from './HiloRangeValue';
import {ConcurrencyException} from '../Database/DatabaseExceptions';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {StringUtil} from '../Utility/StringUtil';
import {PromiseResolver, PromiseResolve, PromiseReject} from '../Utility/PromiseResolver';
import {HiloNextCommand} from './Commands/HiloNextCommand';
import {HiloReturnCommand} from './Commands/HiloReturnCommand';
import {ILockDoneCallback} from '../Lock/LockCallbacks';
import {DateUtil} from '../Utility/DateUtil';
import {Lock} from '../Lock/Lock';
import * as BluebirdPromise from 'bluebird';
import {IRavenResponse} from "../Database/RavenCommandResponse";

export class HiloIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
  private _lastRangeAt: Date;
  private _range: HiloRangeValue;
  private identityPartsSeparator: string;
  private _lock: Lock;
  private _prefix?: string = null;
  private _lastBatchSize: number = 0;

  constructor(store: IDocumentStore, dbName?: string, tag?: string) {
    super(store, dbName, tag);

    this._lastRangeAt = DateUtil.zeroDate();
    this._range = new HiloRangeValue();
    this.identityPartsSeparator = this.conventions.identityPartsSeparator;
    this._lock = Lock.getInstance();
  }

  public generateDocumentId(): BluebirdPromise<string> {
    return new BluebirdPromise<string>(
      (resolve: PromiseResolve<string>, reject: PromiseReject) => this
        .tryRequestNextRange(resolve, reject)
    );
  }

  public returnUnusedRange(): BluebirdPromise<void> {
    const range = this._range;

    return this.store.getRequestExecutor()
      .execute(new HiloReturnCommand(
        this.tag, range.current, range.maxId
      ))
      .then((): void => {});
  }

  protected getNextRange(): BluebirdPromise<HiloRangeValue> {
    return this.store.getRequestExecutor().execute(new HiloNextCommand(
      this.tag, this._lastBatchSize, this._lastRangeAt,
      this.identityPartsSeparator, this._range.maxId
    ))
    .then((response: IRavenResponse) => {
      this._prefix = response['prefix'];
      this._lastBatchSize = response['last_size'];
      this._lastRangeAt = DateUtil.parse(response['last_range_at']);

      return new HiloRangeValue(response['low'], response['high']);
    });
  }

  protected tryRequestNextRange(resolve: PromiseResolve<string>, reject: PromiseReject): void {
    this._lock.acquireIdGenerator(this.tag, this._range,
    (done: ILockDoneCallback): any => {
      this._range.increment();
      this.getNextRange()
        .then((range: HiloRangeValue) => done(null, range))
        .catch((error: Error) => done(error));
    }, (error?: Error, result?: HiloRangeValue) => {
      if (result) {
        PromiseResolver.resolve<string>(this.assembleDocumentId(result.current), resolve);
      } else if (!(error instanceof ConcurrencyException)) {
        PromiseResolver.reject(error, reject);
      } else {
        this.tryRequestNextRange(resolve, reject);
      }
    });
  }

  protected assembleDocumentId(currentRangeValue: number): string {
    return StringUtil.format('{0}{1}', (this._prefix || ''), currentRangeValue);
  }
}
