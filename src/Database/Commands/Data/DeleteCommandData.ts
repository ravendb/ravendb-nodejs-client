import {RavenCommandData} from '../../RavenCommandData';
import {DocumentKey} from '../../../Documents/IDocument';
import {RequestMethods} from "../../../Http/Request/RequestMethod";

export class DeleteCommandData extends RavenCommandData {
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