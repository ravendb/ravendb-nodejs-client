import * as BluebirdPromise from "bluebird";
import * as semaphore from "semaphore";

import { IDocumentStore } from "../../Documents/IDocumentStore";
import { DateUtil } from "../../Utility/DateUtil";
import { acquireSemaphore } from "../../Utility/SemaphoreUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { HiloReturnCommand } from "./Commands/HiloReturnCommand";
import { NextHiloCommand, HiLoResult } from "./Commands/NextHiloCommand";
import { HiloRangeValue } from "./HiloRangeValue";
import { DocumentConventions } from "../Conventions/DocumentConventions";

export class HiloIdGenerator {
    private _store: IDocumentStore;
    private readonly _dbName: string;
    private readonly _tag: string;
    private _conventions: DocumentConventions;
    private _lastRangeAt: Date;
    private _range: HiloRangeValue;
    private readonly _identityPartsSeparator: string;
    private _prefix?: string = null;
    private _lastBatchSize: number = 0;
    private _serverTag: string = null;
    private _generatorLock = semaphore();

    constructor(store: IDocumentStore, dbName?: string, tag?: string) {
        this._lastRangeAt = DateUtil.zeroDate();
        this._range = new HiloRangeValue();
        this._conventions = store.conventions;
        this._identityPartsSeparator = this._conventions.identityPartsSeparator;
        this._tag = tag;
        this._store = store;
        this._dbName = dbName || store.database;
    }

    // noinspection JSUnusedLocalSymbols
    public generateDocumentId(entity: object): Promise<string> {
        return Promise.resolve()
            .then(() => this.nextId())
            .then((nextId) => this._getDocumentIdFromId(nextId));
    }

    protected _getDocumentIdFromId(nextId: number) {
        return this._prefix + nextId + "-" + this._serverTag;
    }

    public nextId(): Promise<number> {

        const getNextIdWithinRange = (): Promise<number> => {
            // local range is not exhausted yet
            const range = this._range;

            let id = range.increment();
            if (id <= range.maxId) {
                return Promise.resolve(id);
            }

            //local range is exhausted , need to get a new range
            const acquiredSemContext = acquireSemaphore(this._generatorLock, {
                contextName: `${this.constructor.name}_${this._tag}`
            });
            return Promise.resolve(acquiredSemContext.promise)
                .then(() => {

                    const maybeNewRange = this._range;
                    if (maybeNewRange !== range) {
                        id = maybeNewRange.increment();
                        if (id <= maybeNewRange.maxId) {
                            return BluebirdPromise.resolve(id)
                                .finally(() => acquiredSemContext.dispose());
                        }
                    }

                    return BluebirdPromise.resolve(this._getNextRange())
                        .finally(() => acquiredSemContext.dispose())
                        .then(() => getNextIdWithinRange());
                });
        };

        return getNextIdWithinRange();
    }

    public returnUnusedRange(): Promise<void> {
        const range = this._range;
        const executor = this._store.getRequestExecutor(this._dbName);

        return executor.execute(new HiloReturnCommand(this._tag, range.current, range.maxId));
    }

    protected _getNextRange(): Promise<void> {
        const hiloCmd = new NextHiloCommand(
            this._tag, 
            this._lastBatchSize, 
            this._lastRangeAt, 
            this._identityPartsSeparator, 
            this._range.maxId,
            this._store.conventions);
        return this._store.getRequestExecutor(this._dbName).execute(hiloCmd)
            .then(() => {
                const result: HiLoResult = hiloCmd.result;
                this._prefix = result.prefix;
                this._lastBatchSize = result.lastSize;
                this._serverTag = result.serverTag || null;
                this._lastRangeAt = result.lastRangeAt;

                this._range = new HiloRangeValue(result.low, result.high);
            });
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
