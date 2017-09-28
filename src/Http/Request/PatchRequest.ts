import * as _ from 'lodash';
import {IJsonable, IStringable} from '../../Typedef/Contracts';
import {IRavenObject} from '../../Typedef/IRavenObject';
import {IndexQuery} from '../../Database/Indexes/IndexQuery';
import {QueryKeywords} from "../../Documents/Session/Query/QueryLanguage";

export type PatchStatus = 'DocumentDoesNotExist' | 'Created' | 'Patched' | 'Skipped' | 'NotModified';

export class PatchStatuses {
  public static readonly DocumentDoesNotExist: PatchStatus = 'DocumentDoesNotExist';
  public static readonly Created: PatchStatus = 'Created';
  public static readonly Patched: PatchStatus = 'Patched';
  public static readonly Skipped: PatchStatus = 'Skipped';
  public static readonly NotModified: PatchStatus = 'NotModified';
}

export interface IPatchRequestOptions {
  changeVector?: string,
  patchIfMissing?: PatchRequest, 
  skipPatchIfChangeVectorMismatch?: boolean,
  returnDebugInformation?: boolean
}

export interface IPatchResult {
  Status: PatchStatus;
  Document?: IRavenObject;
}

export class PatchRequest implements IJsonable, IStringable {
  private _script: string;
  protected values: object = {};

  constructor(script: string, values?: object) {
    this._script = script;

    if (values) {
      this.values = values;
    }
  }

  public get script(): string {
    return this._script;
  }

  public toJson(): object {
    return {
      "Script": this._script,
      "Values": this.values
    };
  }

  public applyToQuery(indexQuery: IndexQuery): void {
    let query: string = indexQuery.query;
    
    if (!query.toUpperCase().includes(QueryKeywords.Update)) {
      indexQuery.query = `${query} ${QueryKeywords.Update} { ${this._script} }`;
      _.assign(indexQuery.queryParameters, this.values || {});
    }
  }
}

