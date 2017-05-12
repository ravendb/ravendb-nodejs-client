import * as Promise from 'bluebird';

export interface IHiloKeyGenerator {
  generateDocumentKey(...args: (Object | string | string)[]): Promise<string>;
  returnUnusedRange(): Promise<void>;
}
