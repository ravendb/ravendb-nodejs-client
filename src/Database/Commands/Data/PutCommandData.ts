import * as _ from 'lodash';
import {RavenCommandData} from '../../RavenCommandData';
import {RequestMethods} from "../../../Http/Request/RequestMethod";
import {IJsonable} from "../../../Typedef/Contracts";

export class PutCommandData extends RavenCommandData implements IJsonable  {
  protected document: object;
  protected metadata?: object;

  constructor(id: string, document: object, changeVector?: string, metadata?: object) {
    super(id, changeVector);

    this.type = RequestMethods.Put;
    this.document = document;
    this.metadata = metadata;
  }

  public toJson(): object {
    let document: object = this.document;

    if (this.metadata) {
      document['@metadata'] = this.metadata;
    }

    return _.assign(super.toJson(), {
      "Document": document
    });
  }
}
