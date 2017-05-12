import {IJsonSerializable} from '../../Json/IJsonSerializable';

export class PatchRequest implements IJsonSerializable {
  private _script: string;
  protected values: Object = {};

  constructor(script: string, values?: Object) {
    this._script = script;

    if (values) {
      this.values = values;
    }
  }

  public get script(): string {
    return this._script;
  }

  public toJson(): Object {
    return {
      "Script": this._script,
      "Values": this.values
    };
  }
}