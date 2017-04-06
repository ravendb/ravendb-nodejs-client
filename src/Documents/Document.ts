import {IDocument, DocumentKey} from './IDocument';
import {Serializer} from '../Json/Serializer';
import {Hash} from '../Utility/Hash';
import {IMetadata} from "../Database/Metadata";

export class Document extends Hash implements IDocument {
  id: DocumentKey;
  '@metadata': IMetadata;

  constructor(attributes?: Object, metadata?: IMetadata)
  {
    super();

    if (attributes instanceof Object) {
      Serializer.fromJSON<Document>(Document, attributes, metadata, this);
    }

    this['@metadata'] = metadata || {};
  }
}