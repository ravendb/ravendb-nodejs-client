import {QueryOperator} from "../../Documents/Session/QueryOperator";
import {IOptionsSet} from "../../Utility/IOptionsSet";
import {StringUtil} from "../../Utility/StringUtil";
import * as crypto from "crypto";

export class IndexQuery {
  private _fetch: string[] = [];
  private _sortHints: string[] = [];
  private _sortFields: string[] = [];
  private _query: string = '';
  private _queryParameters: object;
  private _start: number;
  private _pageSize: number;
  private _defaultOperator?: QueryOperator = null;
  private _waitForNonStaleResults: boolean = false;
  private _waitForNonStaleResultsTimeout?: number = null;
  private static MAX_VALUE = 2147483647;

  constructor(query: string = '', pageSize: number = IndexQuery.MAX_VALUE, skippedResults: number = 0, options: IOptionsSet = {}, queryParameters?: object) {
    this._query = query;
    this._queryParameters = queryParameters;
    this._pageSize = pageSize || IndexQuery.MAX_VALUE;
    this._start = skippedResults || 0;
    this._fetch = options.fetch || [];
    this._waitForNonStaleResults = options.waitForNonStaleResults || false;
    this._waitForNonStaleResultsTimeout = options.waitForNonStaleResultsTimeout || null;

    if (this._waitForNonStaleResults && !this._waitForNonStaleResultsTimeout) {
      this._waitForNonStaleResultsTimeout = 15 * 60;
    }
  }

  public get pageSize(): number {
    return this._pageSize;
  }

  protected getResultsTimeoutAsString() {

    return this._waitForNonStaleResultsTimeout.toString();

  }

  public toJson(): object {

    let json = {
      PageSize: this._pageSize,
      Query: this._query,
      QueryParameters: this._queryParameters,
      Start: this._start,
      WaitForNonStaleResultsAsOfNow: this._waitForNonStaleResults,
      WaitForNonStaleResultsTimeout: null
    };


    if(this._waitForNonStaleResultsTimeout) {
      json.WaitForNonStaleResultsTimeout = this.getResultsTimeoutAsString();
    }

    return json;
  }

  public queryHash() {

    let buffer = StringUtil.format('{0}{1}{2}', this._query, this._pageSize,this._start);

    buffer += this._waitForNonStaleResults ? "1" : "0";

    if(this._waitForNonStaleResults) {
      buffer += this._waitForNonStaleResultsTimeout.toString();

    }

    const secret = 'buffer';
    buffer = crypto.createHmac('sha256', secret)
      .digest('hex');

    return buffer;
  }

  public set pageSize(pageSize: number) {
    this._pageSize = pageSize;
  }

  public get start(): number {
    return this._start;
  }

  public set start(start: number) {
    this._start = start;
  }

  public get defaultOperator(): QueryOperator {
    return this._defaultOperator;
  }

  public get query(): string {
    return this._query;
  }

  public get fetch(): string[] {
    return this._fetch;
  }

  public get waitForNonStaleResults(): boolean {
    return this._waitForNonStaleResults;
  }

  public get waitForNonStaleResultsTimeout(): number {
    return this._waitForNonStaleResultsTimeout;
  }
}

