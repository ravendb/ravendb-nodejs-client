export class ServerNode {
  private _database: string;
  private _url: string;
  private _apiKey?: string;
  private _currentToken?: string;
  private _responseTime: number[] = [];
  private _isRateSurpassed?: boolean = null;
  private _isFailed: boolean = false;

  constructor(url: string, database: string, apiKey?: string, currentToken?: string, isFailed: boolean = false) {
    this._url = url;
    this._database = database;
    this._apiKey = apiKey;
    this._currentToken = currentToken;
    this._isFailed = isFailed;
  }

  public get database(): string {
    return this._database;
  }

  public get url(): string {
    return this._url;
  }

  public get apiKey(): string {
    return this._apiKey;
  }

  public get currentToken(): string {
    return this._currentToken;
  }

  public set currentToken(value: string) {
    this._currentToken = value;
  }

  public get isFailed(): boolean {
    return this._isFailed;
  }

  public set isFailed(value: boolean) {
    this._isFailed = value;
  }

  public get responseTime(): number[] {
    return this._responseTime;
  }

  public get ewma(): number {
    let ewma: number = 0;
    let divide: number = this._responseTime.length;

    if (0 === divide) {
      return ewma;
    }

    ewma = this._responseTime.reduce((total: number, time: number) => (total + time));
    return (0 === ewma) ? 0 : ewma / divide;
  }

  public addResponseTime(value: number) {
    this._responseTime[this._responseTime.length % 5] = value;
  }

  public isRateSurpassed(requestTimeSlaThresholdInMilliseconds): boolean {
    return this._isRateSurpassed = this.ewma
      >= (this._isRateSurpassed ? 0.75 : 1)
      * requestTimeSlaThresholdInMilliseconds;
  }
}