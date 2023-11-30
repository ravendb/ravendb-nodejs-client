import { IDocumentStore } from "../IDocumentStore";
import { DateUtil } from "../../Utility/DateUtil";
import { HiloReturnCommand } from "./Commands/HiloReturnCommand";
import { NextHiloCommand, HiLoResult } from "./Commands/NextHiloCommand";
import { HiloRangeValue } from "./HiloRangeValue";
import { Lazy } from "../Lazy";
import { NextId } from "./NextId";

export class HiloIdGenerator {
    private _store: IDocumentStore;
    private readonly _tag: string;
    protected _prefix?: string = null;
    private _lastBatchSize: number = 0;
    private _lastRangeAt: Date;
    private readonly _dbName: string;
    private readonly _identityPartsSeparator: string;
    private _range: HiloRangeValue;

    /**
     * @deprecated Will be removed in next major version of the product. Use field Range.ServerTag instead.
     * @private
     */
    private _serverTag: string = null;

    private _nextRangeTask: Lazy<void>;

    constructor(tag: string, store: IDocumentStore, dbName: string, identityPartsSeparator: string) {
        this._store = store;
        this._tag = tag;
        this._dbName = dbName;
        this._identityPartsSeparator = identityPartsSeparator;
        this._lastRangeAt = DateUtil.zeroDate();
        this._range = new HiloRangeValue(1, 0, null);
    }

    /**
     * @deprecated Will be removed in next major version of the product. Use the getDocumentIdFromId(NextId) overload.
     * @param nextId next id
     * @protected
     */
    protected _getDocumentIdFromId(nextId: number) {
        return this._prefix + nextId + "-" + this._serverTag;
    }

    // noinspection JSUnusedLocalSymbols
    public async generateDocumentId(entity: object): Promise<string> {
        const nextId = await this.getNextId();
        return this._getDocumentIdFromId(nextId.id);
    }


    public async getNextId(): Promise<NextId> {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const current = this._nextRangeTask;

            // local range is not exhausted yet
            const range = this._range;

            const id = range.increment();
            if (id <= range.maxId) {
                return {
                    id,
                    serverTag: range.serverTag
                }
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

    public async nextId(): Promise<number> {
        const result = await this.getNextId();
        return result.id;
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

        this._range = new HiloRangeValue(result.low, result.high, result.serverTag);
    }

    public returnUnusedRange(): Promise<void> {
        const range = this._range;
        const executor = this._store.getRequestExecutor(this._dbName);

        return executor.execute(new HiloReturnCommand(this._tag, range.current, range.maxId));
    }

    public get range(): HiloRangeValue {
        return this._range;
    }

    public set range(value: HiloRangeValue) {
        this._range = value;
    }

}
