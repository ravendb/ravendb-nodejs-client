import {DocumentKey, IDocument, IDocumentType} from '../Documents/IDocument';
import * as Promise from 'bluebird';

export interface IHiloKeyGenerator {
  generateDocumentKey(...args: (IDocument | IDocumentType | string)[]): Promise<DocumentKey>;
  returnUnusedRange(): Promise<void>;
}
