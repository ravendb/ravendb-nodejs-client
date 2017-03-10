import {IDocument} from './IDocument';
import {Serializer} from '../Json/Serializer';

export class Document extends Object implements IDocument {
  constructor(attributes?: Object)
  {
    super();
    Serializer.fromJSON<Document>(Document, attributes, this);
  }
}