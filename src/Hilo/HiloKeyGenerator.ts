import {IHiloKeyGenerator} from './IHiloKeyGenerator';
import {AbstractHiloKeyGenerator} from './AbstractHiloKeyGenerator';
import {HiloRangeValue} from './HiloRangeValue';
import {FetchConcurrencyException} from '../Database/DatabaseExceptions';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {DocumentID, DocumentKey} from '../Documents/IDocument';
import {EntityKeyCallback} from '../Utility/Callbacks';
import {StringUtil} from '../Utility/StringUtil';
import {PromiseResolver, PromiseResolve, PromiseReject} from '../Utility/PromiseResolver';
import {HiloNextCommand} from './Commands/HiloNextCommand';
import {HiloReturnCommand} from './Commands/HiloReturnCommand';
import {ILockDoneCallback} from '../Lock/LockCallbacks';
import {DateUtil} from '../Utility/DateUtil';
import {Lock} from '../Lock/Lock';
import * as Promise from 'bluebird';
import {IRavenCommandResponse} from "../Database/IRavenCommandResponse";

export class HiloKeyGenerator extends AbstractHiloKeyGenerator implements IHiloKeyGenerator {
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

  public generateDocumentKey(callback?: EntityKeyCallback): Promise<DocumentKey> {
    return new Promise<DocumentKey>((resolve: PromiseResolve<DocumentKey>, reject: PromiseReject) => {
      this.tryRequestNextRange(resolve, reject, callback);
    });
  }

  public returnUnusedRange(): Promise<void> {
    const range = this._range;

    return this.store.getRequestsExecutor()
      .execute(new HiloReturnCommand(
        this.tag, range.current, range.maxId
      ))
      .then((): void => {});
  }

  protected getNextRange(): Promise<HiloRangeValue> {
    return this.store.getRequestsExecutor().execute(new HiloNextCommand(
      this.tag, this._lastBatchSize, this._lastRangeAt,
      this.identityPartsSeparator, this._range.maxId
    ))
    .then((response: IRavenCommandResponse) => {
      this._prefix = response['prefix'];
      this._lastBatchSize = response['last_size'];
      this._lastRangeAt = DateUtil.parse(response['last_range_at']);

      return new HiloRangeValue(response['low'], response['high']);
    });
  }

  protected tryRequestNextRange(resolve: PromiseResolve<DocumentKey>, reject: PromiseReject, callback?: EntityKeyCallback): void {
    this._lock.acquireKey(this.tag, this._range,
    (done: ILockDoneCallback): any => {
      this._range.increment();
      this.getNextRange()
        .then((range: HiloRangeValue) => done(null, range))
        .catch((error: Error) => done(error));
    }, (error?: Error, result?: HiloRangeValue) => {
      if (result) {
        PromiseResolver.resolve<DocumentKey>(this.getDocumentKeyFromId(result.current), resolve, callback);
      } else if (!(error instanceof FetchConcurrencyException)) {
        PromiseResolver.reject(error, reject, callback);
      } else {
        this.tryRequestNextRange(resolve, reject, callback);
      }
    });
  }

  protected getDocumentKeyFromId(id: DocumentID): DocumentKey {
    return StringUtil.format('{0}{1}', (this._prefix || ''), id);
  }
}
