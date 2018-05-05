import * as BluebirdPromise from "bluebird";
import * as semaphore from "semaphore";

import { IDocumentStore } from "../../Documents/IDocumentStore";
import { throwError, RavenErrorType } from "../../Exceptions";
import { DateUtil } from "../../Utility/DateUtil";
import { acquireSemaphore } from "../../Utility/SemaphoreUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { AbstractHiloIdGenerator } from "./AbstractHiloIdGenerator";
import { HiloReturnCommand } from "./Commands/HiloReturnCommand";
import { NextHiloCommand, HiLoResult } from "./Commands/NextHiloCommand";
import { HiloRangeValue } from "./HiloRangeValue";
import { IHiloIdGenerator } from "./IHiloIdGenerator";

export class HiloIdGenerator extends AbstractHiloIdGenerator implements IHiloIdGenerator {
    private _lastRangeAt: Date;
    private _range: HiloRangeValue;
    private _identityPartsSeparator: string;
    private _prefix?: string = null;
    private _lastBatchSize: number = 0;
    private _serverTag: string = null;
    private _semaphore = semaphore();

    constructor(store: IDocumentStore, dbName?: string, tag?: string) {
        super(store, dbName, tag);

        this._lastRangeAt = DateUtil.zeroDate();
        this._range = new HiloRangeValue();
        this._identityPartsSeparator = this._conventions.identityPartsSeparator;
    }

    public generateDocumentId(entity: object): Promise<string> {
        return Promise.resolve()
            .then(() => this.nextId())
            .then((nextId) => this._getDocumentIdFromId(nextId));
    }

    protected _getDocumentIdFromId(nextId: number) {
        return this._prefix + nextId + "-" + this._serverTag;
    }

    public nextId(): Promise<number> {

        const getNextIdWithinRange = (range: HiloRangeValue): Promise<number> => {
            debugger;
            const id = range.increment();
            if (id <= range.maxId) {
                return Promise.resolve(id);
            }

            return this._tryRequestNextRange()
                .then((newRange) => getNextIdWithinRange(newRange) as Promise<number>);
        };

        return getNextIdWithinRange(this._range);
    }

    public returnUnusedRange(): Promise<void> {
        const range = this._range;
        const executor = this._store.getRequestExecutor(this._dbName);

        return executor.execute(new HiloReturnCommand(this._tag, range.current, range.maxId));
    }

    protected _getNextRange(): Promise<HiloRangeValue> {
        const hiloCmd = new NextHiloCommand(
            this._tag, this._lastBatchSize, this._lastRangeAt, this._identityPartsSeparator, this._range.maxId);
        return this._store.getRequestExecutor(this._dbName).execute(hiloCmd)
            .then(() => {
                const result: HiLoResult = hiloCmd.result;
                this._prefix = result.prefix;
                this._lastBatchSize = result.lastSize;
                this._serverTag = result.serverTag || null;
                this._lastRangeAt = result.lastRangeAt;

                return new HiloRangeValue(result.low, result.high);
            });
    }

    protected _tryRequestNextRange(): Promise<HiloRangeValue> {
        const range: HiloRangeValue = this._range;

        const acquiredSemContext = acquireSemaphore(this._semaphore);

        const result = BluebirdPromise.resolve(acquiredSemContext.promise)
            .then(() => {
                if (!range.needsNewRange()) {
                    range.increment();

                    return BluebirdPromise.resolve<HiloRangeValue>(range);
                }

                return this._getNextRange()
                    .then((newRange: HiloRangeValue): HiloRangeValue => {
                        this._range = newRange;

                        return newRange;
                    });
            })
            .catch((err: Error) => {
                if (!(err.name === "ConcurrencyException" as RavenErrorType)) {
                    throwError("ConcurrencyException", "Error getting new hilo range.", err);
                } else {
                    return this._tryRequestNextRange();
                }
            })
            .finally(() => acquiredSemContext.dispose());
        
        return Promise.resolve(result);
    }

    protected _assembleDocumentId(currentRangeValue: number): string {
        const prefix: string = (this._prefix || "");
        const serverTag: string = this._serverTag;

        if (serverTag) {
            return StringUtil.format("{0}{1}-{2}", prefix, currentRangeValue, serverTag);
        }

        return StringUtil.format("{0}{1}", prefix, currentRangeValue);
    }


    public get range(): HiloRangeValue {
        return this._range;
    }

    public set range(value: HiloRangeValue) {
        this._range = value;
    }
    
}
