export class LinkedList<T> {
  private _items: T[];

  public get count(): number {
    return this._items.length;
  }

  public get first(): T | null {
    if (!this.count) {
      return null;
    }

    return this._items[0];
  }

  public get last(): T | null {
    if (!this.count) {
      return null;
    }

    return this._items[this.count - 1];
  }

  constructor(items: T[] = []) {
    this._items = items;
  }

  public addLast(item: T): LinkedList<T> {
    this._items.push(item);

    return this;
  }
}