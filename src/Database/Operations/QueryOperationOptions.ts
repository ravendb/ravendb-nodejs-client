export class QueryOperationOptions {
  private _allowStale: boolean = true;
  private _staleTimeout?: number = null;
  private _maxOpsPerSec?: number = null;
  private _retrieveDetails:boolean = false;

  constructor(allowStale: boolean = true, staleTimeout?: number, maxOpsPerSec?: number, retrieveDetails:boolean = false) {
    this._allowStale = allowStale;
    this._staleTimeout = staleTimeout;
    this._maxOpsPerSec = maxOpsPerSec;
    this._retrieveDetails = retrieveDetails;
  }

  public get allowStale(): boolean {
    return this._allowStale;
  }

  public get staleTimeout(): number {
    return this._staleTimeout;
  }

  public get maxOpsPerSec(): number {
    return this._maxOpsPerSec;
  }

  public get retrieveDetails(): boolean {
    return this._retrieveDetails;
  }
}
