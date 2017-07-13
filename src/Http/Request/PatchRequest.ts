import {IJsonable} from '../../Json/Contracts';

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