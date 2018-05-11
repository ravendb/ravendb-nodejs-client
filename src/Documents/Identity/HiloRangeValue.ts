export class HiloRangeValue {
  private _minId: number;
  private _maxId: number;
  private _current: number;

  constructor(minId: number = 1, maxId: number = 0)
  {
    this._minId = minId;
    this._maxId = maxId;
    this._current = minId - 1;
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

  public increment(): number {
    return ++this._current;
  }

  public needsNewRange(): boolean {
    return this._current >= this._maxId;
  }
}