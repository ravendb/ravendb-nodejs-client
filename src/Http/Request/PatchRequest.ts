import {IJsonable} from '../../Json/Contracts';
import {IRavenObject} from '../../Database/IRavenObject';

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

export class PatchRequest implements IJsonable {
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
}

