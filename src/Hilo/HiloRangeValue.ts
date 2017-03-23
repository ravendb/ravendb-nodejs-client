import {DocumentID} from '../Documents/IDocument';

export class HiloRangeValue {
  private _minId: DocumentID;
  private _maxId: DocumentID;
  private _current: DocumentID;

  constructor(minId: DocumentID = 1, maxId: DocumentID = 0)
  {
    this._minId = minId;
    this._maxId = minId;
    this._current = minId - 1;
  }

  public get minId(): DocumentID {
    return this._minId;
  }

  public get maxId(): DocumentID {
    return this._maxId;
  }

  public get current(): DocumentID {
    return this._current;
  }

  public increment(): DocumentID {
    return ++this._current;
  }
}