import {IJsonSerializable} from '../../Json/IJsonSerializable';

export class PatchRequest implements IJsonSerializable {
  protected script: string;
  protected values: Object = {};

  constructor(script: string, values?: Object) {
    this.script = script;

    if (values) {
      this.values = values;
    }
  }

  public toJson(): Object {
    return {
      "Script": this.script,
      "Values": this.values
    };
  }
}