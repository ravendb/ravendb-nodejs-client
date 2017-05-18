import * as Promise from 'bluebird';

export interface IHiloKeyGenerator {
  generateDocumentKey(...args: (object | string | string)[]): Promise<string>;
  returnUnusedRange(): Promise<void>;
}
