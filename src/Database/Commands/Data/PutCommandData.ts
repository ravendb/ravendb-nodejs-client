import {RavenCommandData} from '../../RavenCommandData';
import {DocumentKey} from '../../../Documents/IDocument';
import {IMetadata} from '../../Metadata';
import {RequestMethods} from "../../../Http/Request/RequestMethod";

export class PutCommandData extends RavenCommandData {
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
