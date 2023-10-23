export class HiloRangeValue {
    private readonly _minId: number;
    private readonly _maxId: number;
    private readonly _serverTag: string;
    private _current: number;

    constructor(minId: number = 1, maxId: number = 0, serverTag: string) {
        this._minId = minId;
        this._maxId = maxId;
        this._current = minId - 1;
        this._serverTag = serverTag;
    }

    public get minId(): number {
        return this._minId;
    }

    public get maxId(): number {
        return this._maxId;
    }

    public get current(): number {
        return this._current;
    }

    public get serverTag(): string {
        return this._serverTag;
    }

    public increment(): number {
        return ++this._current;
    }
}
