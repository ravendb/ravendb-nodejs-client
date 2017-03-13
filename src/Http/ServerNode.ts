export class ServerNode {
  private _database: string;
  private _url: string;
  private _apiKey?: string;
  private _currentToken?: string;
  private _isFailed: boolean = false;

  constructor(url: string, database: string, apiKey?: string, currentToken?: string, isFailed: boolean = false) {
    this._url = url;
    this._database = database;
    this._apiKey = apiKey;
    this._currentToken = currentToken;
    this._isFailed = isFailed;
  }

  get database(): string {
    return this._database;
  }

  get url(): string {
    return this._url;
  }

  get apiKey(): string {
    return this._apiKey;
  }

  get currentToken(): string {
    return this._currentToken;
  }

  get isFailed(): boolean {
    return this._isFailed;
  }
}