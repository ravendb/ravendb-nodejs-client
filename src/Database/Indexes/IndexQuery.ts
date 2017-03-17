import {QueryOperator} from "../../Documents/Session/QueryOperator";
import {IOptionsSet} from "../../Utility/IOptionsSet";

export class IndexQuery {
  protected query: string = '';
  protected totalSize: number = 0;
  protected skippedResults: number = 0;
  protected defaultOperator?: QueryOperator = null;
  protected sortHints: string[] = [];
  protected sortFields: string[] = [];
  protected fetch: string[] = [];
  protected waitForNonStaleResults: boolean = false;
  protected waitForNonStaleResultsTimeout?: number = null;
  private _pageSize: number = 128;
  private _isPageSizeSet: boolean = false;

  constructor(query: string = '', totalSize: number = 0, skippedResults: number = 0,
    defaultOperator?: QueryOperator, options: IOptionsSet = {}
  ) {
    this.query = query;
    this.totalSize = totalSize;
    this.skippedResults = skippedResults;
    this.defaultOperator = defaultOperator;
    this.fetch = options.fetch || [];
    this.sortHints = options.sort_hints || [];
    this.sortFields = options.sort_fields || [];
    this.waitForNonStaleResults = options.wait_for_non_stale_results || false;
    this.waitForNonStaleResultsTimeout = options.wait_for_non_stale_results_timeout || null;

    if (this.waitForNonStaleResults && !this.waitForNonStaleResultsTimeout) {
      this.waitForNonStaleResultsTimeout = 15 * 60;
    }
  }

  public get pageSize(): number {
    return this._pageSize;
  }

  public set pageSize(pageSize: number) {
    this._pageSize = pageSize;
    this._isPageSizeSet = true;
  }
}