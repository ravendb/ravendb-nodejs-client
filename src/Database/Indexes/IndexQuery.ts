import {QueryOperator, QueryOperators} from "../../Documents/Session/QueryOperator";
import {IOptionsSet} from "../../Utility/IOptionsSet";

export class IndexQuery {
  private _fetch: string[] = [];
  private _sortHints: string[] = [];
  private _sortFields: string[] = [];
  private _query: string = '';
  private _start: number;
  private _pageSize: number;
  private _defaultOperator?: QueryOperator = null;
  private _waitForNonStaleResults: boolean = false;
  private _waitForNonStaleResultsTimeout?: number = null;

  constructor(query: string = '', pageSize: number = 128, skippedResults: number = 0,
    defaultOperator?: QueryOperator, options: IOptionsSet = {}
  ) {
    this._query = query;
    this._pageSize = pageSize || 128;
    this._start = skippedResults || 0;
    this._fetch = options.fetch || [];
    this._sortHints = options.sort_hints || [];
    this._sortFields = options.sort_fields || [];
    this._defaultOperator = defaultOperator || QueryOperators.OR;
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

  public get sortHints(): string[] {
    return this._sortHints;
  }

  public get sortFields(): string[] {
    return this._sortFields;
  }

  public get waitForNonStaleResults(): boolean {
    return this._waitForNonStaleResults;
  }

  public get waitForNonStaleResultsTimeout(): number {
    return this._waitForNonStaleResultsTimeout;
  }
}

