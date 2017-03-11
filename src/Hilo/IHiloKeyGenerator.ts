import {DocumentID, IDocument} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export interface IHiloKeyGenerator {
  generateDocumentKey(dbName: string, entity: IDocument, callback?: IDCallback): Promise<DocumentID>;
  generateDocumentKey(entity: IDocument, callback?: IDCallback): Promise<DocumentID>;
  generateDocumentKey(callback?: IDCallback): Promise<DocumentID>;
  returnUnusedRange(): void;
}

