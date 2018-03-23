import * as moment from "moment";
import * as Cache from "safe-memory-cache/map";
import { IDisposable } from "../Typedef/Contracts";

export interface CachedItemMetadata {
    changeVector: string;
    response: string;
}
export class HttpCache implements IDisposable {
    
    private _items: Cache;

    // TODO

    constructor(maxKeysSize: number) {
        this._items = new Cache({
            limit: maxKeysSize
        });
    }

    public dispose(): void {
        this._items.clear();
        this._items = null;
    }

    // tslint:disable-next-line:no-empty
    public set(...args: any[]) {} 

    public get<TResult>(
        url: string, 
        itemInfoCallback?: ({ changeVector, response }: CachedItemMetadata) => void): ReleaseCacheItem {
        return new ReleaseCacheItem(null); // TODO
    }

    // tslint:disable-next-line:no-empty
    public setNotFound(...args) {
    }

}

export class ReleaseCacheItem {
    public item: HttpCacheItem;

    constructor(item: HttpCacheItem) {
        this.item = item;
    }

    public notModified(): void {
        if (this.item) {
            this.item.lastServerUpdate = moment().toDate();
        }
    }

    // returns millis
    public get age(): number {
        if (!this.item) {
            return Number.MAX_VALUE; 
        }

        return new Date().valueOf() - this.item.lastServerUpdate.valueOf();
    }

    public get mightHaveBeenModified() {
        return false; // TBD
    }
}

export class HttpCacheItem {
    public changeVector: string;
    public payload: string;
    public lastServerUpdate: Date;

    // TBD public int generation
    public cache: HttpCache;

    public constructor() {
        this.lastServerUpdate = moment().toDate();
    }
}