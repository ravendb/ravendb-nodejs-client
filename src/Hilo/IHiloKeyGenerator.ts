import {DocumentID, IDocument} from '../Documents/IDocument';
import {IDCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export interface IHiloKeyGeneratorsCollection {
  [key: string]: IHiloKeyGenerator;
}

export interface IHiloKeyGenerator {
  generateDocumentKey(...args: (IDocument | IDCallback | string)[]): Promise<DocumentID>;
  returnUnusedRange(): void;
}
