import {DocumentKey, IDocument} from '../Documents/IDocument';
import {EntityKeyCallback} from '../Utility/Callbacks';
import * as Promise from 'bluebird';

export interface IHiloLockDoneCallback {
  (err?: Error, ret?: any): void;
}

export interface IHiloKeyGeneratorsCollection {
  [key: string]: IHiloKeyGenerator;
}

export interface IHiloKeyGenerator {
  generateDocumentKey(...args: (IDocument | EntityKeyCallback | string)[]): Promise<DocumentKey>;
  returnUnusedRange(): void;
}
