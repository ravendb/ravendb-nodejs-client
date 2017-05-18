import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";

export class PutCommandData extends RavenCommandData implements IJsonSerializable  {
  protected document: object;

  constructor(key: string, document: object, etag?: number, metadata?: object) {
    super(key, etag, metadata);

    this.method = RequestMethods.Put;
    this.document = document;
  }

  public toJson(): object {
    return {
      "Method": this.method,
      "Key": this.key,
      "Document": this.document,
      "Etag": this.etag
    };
  }
}
