import * as _ from "lodash";
import * as crypto from "crypto";
import {TypeUtil} from "../../Utility/TypeUtil";
import {IOptionsSet} from "../../Typedef/IOptionsSet";
import {StringUtil} from "../../Utility/StringUtil";
import {IRavenObject} from "../../Typedef/IRavenObject";
import {IJsonable} from "../../Typedef/Contracts";

export class IndexQuery implements IJsonable {
  public static readonly DefaultTimeout: number = 15;

  private _query: string = '';
  private _queryParameters: IRavenObject = {};
  private _start: number;
  private _pageSize: number = TypeUtil.MAX_INT32;
  private _cutOffEtag: number = null;
  private _waitForNonStaleResults: boolean = false;
  private _waitForNonStaleResultsAsOfNow: boolean = false;
  private _waitForNonStaleResultsTimeout?: number = null;

  constructor(query: string = '', pageSize: number = TypeUtil.MAX_INT32, skippedResults: number = 0, 
    queryParameters: IRavenObject = {}, options: IOptionsSet = {}
  ) {
    const {DefaultTimeout} = <(typeof IndexQuery)>this.constructor;

    this._query = query;
    this._queryParameters = queryParameters;
    this._pageSize = pageSize;
    this._start = skippedResults || 0;
    this._cutOffEtag = options.cutOffEtag || null;
    this._waitForNonStaleResults = options.waitForNonStaleResults || false;
    this._waitForNonStaleResultsAsOfNow = options.waitForNonStaleResultsAsOfNow || false;
    this._waitForNonStaleResultsTimeout = options.waitForNonStaleResultsTimeout || null;

    if (!TypeUtil.isNumber(pageSize)) {
      this._pageSize = TypeUtil.MAX_INT32;
    }

    if ((this._waitForNonStaleResults || this._waitForNonStaleResultsAsOfNow)
      && !this._waitForNonStaleResultsTimeout
    ) {
      this._waitForNonStaleResultsTimeout = DefaultTimeout;
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

  public set query(query: string) {
    this._query = query;
  }

  public get query(): string {
    return this._query;
  }

  public get queryParameters(): IRavenObject {
    return this._queryParameters;
  }

  public get cutOffEtag(): number {
    return this._cutOffEtag;
  }

  public get waitForNonStaleResults(): boolean {
    return this._waitForNonStaleResults;
  }

  public get waitForNonStaleResultsAsOfNow(): boolean {
    return this._waitForNonStaleResultsAsOfNow;
  }

  public get waitForNonStaleResultsTimeout(): number {
    return this._waitForNonStaleResultsTimeout;
  }

  public get queryHash(): string {    
    let buffer: string = StringUtil.format('{query}{pageSize}{start}', this);

    buffer += this._waitForNonStaleResults ? "1" : "0";
    buffer += this._waitForNonStaleResultsAsOfNow ? "1" : "0";

    if ((this._waitForNonStaleResults || this._waitForNonStaleResultsAsOfNow)
      && !TypeUtil.isNull(this._waitForNonStaleResultsTimeout)
    ) {
      buffer += this.formattedTimeout;
    }

    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  protected get formattedTimeout(): string {    
    return this.waitForNonStaleResultsTimeout.toString();    
  }

  public toJson(): object {
    let json: object = {
      Query: this._query,
      QueryParameters: this._queryParameters
    };

    if (!TypeUtil.isNull(this._start)) {
      _.assign(json, {
        Start: this._start,
      }); 
    }

    if (!TypeUtil.isNull(this._pageSize)) {
      _.assign(json, {
        PageSize: this._pageSize,
      }); 
    }

    if (!TypeUtil.isNull(this._cutOffEtag)) {
      _.assign(json, {
        CutoffEtag: this._cutOffEtag,
      }); 
    }

    if (this._waitForNonStaleResults) {
      _.assign(json, {
        WaitForNonStaleResults: true,
      }); 
    }

    if (this._waitForNonStaleResultsAsOfNow) {
      _.assign(json, {
        WaitForNonStaleResultsAsOfNow: true,
      }); 
    }

    if ((this._waitForNonStaleResults || this._waitForNonStaleResultsAsOfNow)
      && !TypeUtil.isNull(this._waitForNonStaleResultsTimeout)
    ) {    
      _.assign(json, {
        WaitForNonStaleResultsTimeout: this.formattedTimeout
      });      
    }

    return json;
  }  
}
