import * as semaphore from "semaphore";

import { IDocumentStore } from "../../Documents/IDocumentStore";
import { DateUtil } from "../../Utility/DateUtil";
import { acquireSemaphore, SemaphoreAcquisitionContext } from "../../Utility/SemaphoreUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { HiloReturnCommand } from "./Commands/HiloReturnCommand";
import { NextHiloCommand, HiLoResult } from "./Commands/NextHiloCommand";
import { HiloRangeValue } from "./HiloRangeValue";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { Lazy } from "../Lazy";

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

    private _nextRangeTask: Lazy<void>;

    constructor(tag: string, store: IDocumentStore, dbName: string, identityPartsSeparator: string) {
        this._lastRangeAt = DateUtil.zeroDate();
        this._range = new HiloRangeValue();
        this._conventions = store.conventions;
        this._tag = tag;
        this._store = store;
        this._dbName = dbName;
        this._identityPartsSeparator = identityPartsSeparator;
    }

    // noinspection JSUnusedLocalSymbols
    public async generateDocumentId(entity: object): Promise<string> {
        const nextId = await this.nextId();
        return this._getDocumentIdFromId(nextId);
    }

    protected _getDocumentIdFromId(nextId: number) {
        return this._prefix + nextId + "-" + this._serverTag;
    }

    public async nextId(): Promise<number> {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const current = this._nextRangeTask;

            // local range is not exhausted yet
            const range = this._range;

            const id = range.increment();
            if (id <= range.maxId) {
                return id;
            }

            try {
                // let's try to call the existing task for next range
                await current.getValue();
                if (range !== this._range) {
                    continue;
                }
            } catch (e) {
                // previous task was faulted, we will try to replace it
            }

            // local range is exhausted , need to get a new range
            const maybeNextTask = new Lazy(() => this._getNextRange());
            let changed = false;
            if (this._nextRangeTask === current) {
                changed = true;
                this._nextRangeTask = maybeNextTask;
            }

            if (changed) {
                await maybeNextTask.getValue();
                continue;
            }

            try {
                // failed to replace, let's wait on the previous task
                await this._nextRangeTask.getValue();
            } catch (e) {
                // previous task was faulted, we will try again
            }
        }
    }

    public returnUnusedRange(): Promise<void> {
        const range = this._range;
        const executor = this._store.getRequestExecutor(this._dbName);

        return executor.execute(new HiloReturnCommand(this._tag, range.current, range.maxId));
    }

    protected async _getNextRange(): Promise<void> {
        const hiloCmd = new NextHiloCommand(
            this._tag, 
            this._lastBatchSize, 
            this._lastRangeAt, 
            this._identityPartsSeparator, 
            this._range.maxId,
            this._store.conventions);
        
        await this._store.getRequestExecutor(this._dbName).execute(hiloCmd);

        const result: HiLoResult = hiloCmd.result;
        this._prefix = result.prefix;
        this._lastBatchSize = result.lastSize;
        this._serverTag = result.serverTag || null;
        this._lastRangeAt = result.lastRangeAt;

        this._range = new HiloRangeValue(result.low, result.high);
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
