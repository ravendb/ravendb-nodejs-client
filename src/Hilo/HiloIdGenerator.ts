import * as BluebirdPromise from 'bluebird';
import {IHiloIdGenerator} from './IHiloIdGenerator';
import {AbstractHiloIdGenerator} from './AbstractHiloIdGenerator';
import {HiloRangeValue} from './HiloRangeValue';
import {ConcurrencyException} from '../Database/DatabaseExceptions';
import {IDocumentStore} from '../Documents/IDocumentStore';
import {StringUtil} from '../Utility/StringUtil';
import {HiloNextCommand} from './Commands/HiloNextCommand';
import {HiloReturnCommand} from './Commands/HiloReturnCommand';
import {DateUtil} from '../Utility/DateUtil';
import {Lock} from '../Lock/Lock';
import {IRavenResponse} from "../Database/RavenCommandResponse";

export class HiloIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
  private _lastRangeAt: Date;
  private _range: HiloRangeValue;
  private identityPartsSeparator: string;
  private _lock: Lock;
  private _prefix?: string = null;
  private _lastBatchSize: number = 0;
  private _serverTag: string = null;

  constructor(store: IDocumentStore, dbName?: string, tag?: string) {
    super(store, dbName, tag);

    this._lastRangeAt = DateUtil.zeroDate();
    this._range = new HiloRangeValue();
    this.identityPartsSeparator = this.conventions.identityPartsSeparator;
    this._lock = Lock.make();
  }

  public generateDocumentId(): BluebirdPromise<string> {
    return this.tryRequestNextRange()
      .then((nextRange: HiloRangeValue): string => 
        this.assembleDocumentId(nextRange.current)
      );
  }

  public returnUnusedRange(): BluebirdPromise<void> {
    const range = this._range;

    return this.store.getRequestExecutor(this.dbName)
      .execute(new HiloReturnCommand(
        this.tag, range.current, range.maxId
      ))
      .then((): void => {});
  }

  protected getNextRange(): BluebirdPromise<HiloRangeValue> {
    return this.store.getRequestExecutor(this.dbName).execute(new HiloNextCommand(
      this.tag, this._lastBatchSize, this._lastRangeAt,
      this.identityPartsSeparator, this._range.maxId
    ))
    .then((response: IRavenResponse) => {
      this._prefix = response['prefix'];
      this._lastBatchSize = response['last_size'];
      this._serverTag = response['server_tag'] || null;
      this._lastRangeAt = DateUtil.parse(response['last_range_at']);

      return new HiloRangeValue(response['low'], response['high']);
    });
  }

  protected tryRequestNextRange(): BluebirdPromise<HiloRangeValue> {
    const range: HiloRangeValue = this._range;
    
    return (this._lock
      .acquire((): any => {
          if (!range.needsNewRange) {
            range.increment();

            return BluebirdPromise.resolve<HiloRangeValue>(range);
          }
        
        return this.getNextRange()
          .then((newRange: HiloRangeValue): HiloRangeValue => {
            this._range = newRange;

            return newRange;
          });
      }) as BluebirdPromise<HiloRangeValue>)
      .catch((error: Error): BluebirdPromise<HiloRangeValue> => {
        if (!(error instanceof ConcurrencyException)) {
          return BluebirdPromise.reject(error);
        } else {
          return this.tryRequestNextRange();
        }
      });
  }

  protected assembleDocumentId(currentRangeValue: number): string {
    const prefix: string = (this._prefix || '');
    const serverTag: string = this._serverTag;

    if (serverTag) {
      return StringUtil.format('{0}{1}-{2}', prefix, currentRangeValue, serverTag);
    }
    
    return StringUtil.format('{0}{1}', prefix, currentRangeValue);
  }
}
