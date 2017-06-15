import * as _ from 'lodash';
import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonSerializable} from "../../../Json/IJsonSerializable";

export class PutCommandData extends RavenCommandData implements IJsonSerializable  {
  protected document: object;

  constructor(key: string, document: object, etag?: number, metadata?: object) {
    super(key, etag, metadata);

    this.type = RequestMethods.Put;
    this.document = document;
  }

  public toJson(): object {
    return _.assign(super.toJson(), {
      "Document": this.document
    });
  }
}
