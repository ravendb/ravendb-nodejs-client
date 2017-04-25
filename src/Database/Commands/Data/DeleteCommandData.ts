import {RavenCommandData} from '../../RavenCommandData';
import {DocumentKey} from '../../../Documents/IDocument';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";

export class DeleteCommandData extends RavenCommandData implements IJsonSerializable {
  constructor(key: DocumentKey, etag?: number) {
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
