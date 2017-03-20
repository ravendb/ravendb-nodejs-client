import {IDocument, DocumentKey} from './IDocument';
import {Serializer} from '../Json/Serializer';
import {Hash} from '../Utility/Hash';

export class Document extends Hash implements IDocument {
  _id: DocumentKey;
  [propName: string]: any | any[];

  constructor(attributes?: Object)
  {
    super();

    if (attributes instanceof Object) {
      Serializer.fromJSON<Document>(Document, attributes, this);
    }
  }
}