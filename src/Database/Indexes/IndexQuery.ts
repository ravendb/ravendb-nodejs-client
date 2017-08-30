import * as _ from "lodash";
import * as crypto from "crypto";
import {TypeUtil} from "../../Utility/TypeUtil";
import {IOptionsSet} from "../../Utility/IOptionsSet";
import {StringUtil} from "../../Utility/StringUtil";
import {IRavenObject} from "../../Database/IRavenObject";
import {QueryOperator} from "../../Documents/Session/QueryOperator";
import {IJsonable} from "../../Json/Contracts";

export class IndexQuery implements IJsonable {
  private _fetch: string[] = [];
  private _sortHints: string[] = [];
  private _sortFields: string[] = [];
  private _query: string = '';
  private _params: IRavenObject = {};
  private _start: number;
  private _pageSize: number = TypeUtil.MAX_INT32;
  private _defaultOperator?: QueryOperator = null;
  private _waitForNonStaleResults: boolean = false;
  private _waitForNonStaleResultsTimeout?: number = null;

  constructor(query: string = '', params: IRavenObject = {}, pageSize: number = TypeUtil.MAX_INT32, skippedResults: number = 0, options: IOptionsSet = {}) {
    this._query = query;
    this._params = params;
    this._pageSize = pageSize || TypeUtil.MAX_INT32;
    this._start = skippedResults || 0;
    this._waitForNonStaleResults = options.waitForNonStaleResults || false;
    this._waitForNonStaleResultsTimeout = options.waitForNonStaleResultsTimeout || null;

    if (this._waitForNonStaleResults && !this._waitForNonStaleResultsTimeout) {
      this._waitForNonStaleResultsTimeout = 15 * 60;
    }
  }

  public get pageSize(): number {
    return this._pageSize;
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

  public get queryHash(): string {    
    let buffer: string = StringUtil.format('{query}{pageSize}{start}', this);

    buffer += this._waitForNonStaleResults ? "1" : "0";

    if (this._waitForNonStaleResults) {
      buffer += this.formattedTimeout;
    }

    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  protected get formattedTimeout(): string {    
    return this.waitForNonStaleResultsTimeout.toString();    
  }

  public toJson(): object {
    let json: object = {
      Start: this._start,
      PageSize: this._pageSize,
      Query: this._query,
      QueryParameters: this._params,
      WaitForNonStaleResultsTimeout: null,
      WaitForNonStaleResultsAsOfNow: this._waitForNonStaleResults
    };

    if (this._waitForNonStaleResults) {    
      _.assign(json, {
        WaitForNonStaleResultsTimeout: this.formattedTimeout
      });      
    }

    return json;
  }  
}
