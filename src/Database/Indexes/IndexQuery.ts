import {QueryOperator} from "../../Documents/Session/QueryOperator";
import {IOptionsSet} from "../../Utility/IOptionsSet";

export class IndexQuery {
  protected totalSize: number = 0;
  protected skippedResults: number = 0;
  protected waitForNonStaleResults: boolean = false;
  private _fetch: string[] = [];
  private _sortHints: string[] = [];
  private _sortFields: string[] = [];
  private _query: string = '';
  private _pageSize: number = 128;
  private _isPageSizeSet: boolean = false;
  private _defaultOperator?: QueryOperator = null;
  private _waitForNonStaleResultsTimeout?: number = null;

  constructor(query: string = '', totalSize: number = 0, skippedResults: number = 0,
    defaultOperator?: QueryOperator, options: IOptionsSet = {}
  ) {
    this._query = query;
    this.totalSize = totalSize;
    this.skippedResults = skippedResults;
    this._defaultOperator = defaultOperator;
    this._fetch = options.fetch || [];
    this._sortHints = options.sort_hints || [];
    this._sortFields = options.sort_fields || [];
    this.waitForNonStaleResults = options.wait_for_non_stale_results || false;
    this._waitForNonStaleResultsTimeout = options.wait_for_non_stale_results_timeout || null;

    if (this.waitForNonStaleResults && !this._waitForNonStaleResultsTimeout) {
      this._waitForNonStaleResultsTimeout = 15 * 60;
    }
  }

  public get pageSize(): number {
    return this._pageSize;
  }

  public set pageSize(pageSize: number) {
    this._pageSize = pageSize;
    this._isPageSizeSet = true;
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

  public get waitForNonStaleResultsTimeout(): number {
    return this._waitForNonStaleResultsTimeout;
  }
}

