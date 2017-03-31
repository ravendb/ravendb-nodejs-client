import {RavenCommandPayload} from '../../RavenCommandPayload';
import {DocumentKey} from '../../../Documents/IDocument';
import {IMetadata} from '../../Metadata';
import {RequestMethods} from "../../../Http/Request/RequestMethod";

export class PutCommandPayload extends RavenCommandPayload {
  protected document: Object;

  constructor(key: DocumentKey, document: Object, etag?: number, metadata?: IMetadata) {
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
