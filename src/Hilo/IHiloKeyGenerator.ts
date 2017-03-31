import {DocumentKey, IDocument} from '../Documents/IDocument';
import * as Promise from 'bluebird';

export interface IHiloKeyGenerator {
  generateDocumentKey(...args: (IDocument | string)[]): Promise<DocumentKey>;
  returnUnusedRange(): Promise<void>;
}
