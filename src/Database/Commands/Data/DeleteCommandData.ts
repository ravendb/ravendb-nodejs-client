import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";

export class DeleteCommandData extends RavenCommandData implements IJsonSerializable {
  constructor(key: string, etag?: number) {
    super(key, etag, null);

    this.method = RequestMethods.Delete;
  }

  public toJson(): Object {
    return {
      "Method": this.method,
      "Key": this.key,
      "Etag": this.etag
    };
  }
}
