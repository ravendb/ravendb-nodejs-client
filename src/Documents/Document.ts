import {IDocument} from './IDocument';
import {Serializer} from '../Json/Serializer';

export class Document extends Object implements IDocument {
  constructor(attributes?: Object)
  {
    super();

    if (attributes instanceof Object) {
      Serializer.fromJSON<Document>(Document, attributes, this);
    }
  }
}