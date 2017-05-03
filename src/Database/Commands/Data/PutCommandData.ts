import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";

export class PutCommandData extends RavenCommandData implements IJsonSerializable  {
  protected document: Object;

  constructor(key: string, document: Object, etag?: number, metadata?: Object) {
    super(key, etag, metadata);

    this.method = RequestMethods.Put;
    this.document = document;
  }

  public toJson(): Object {
    return {
      "Method": this.method,
      "Key": this.key,
      "Document": this.document,
      "Etag": this.etag
    };
  }
}
