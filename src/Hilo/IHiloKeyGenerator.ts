import * as BluebirdPromise from 'bluebird';

export interface IHiloKeyGenerator {
  generateDocumentKey(...args: (object | string | string)[]): BluebirdPromise<string>;
  returnUnusedRange(): BluebirdPromise<void>;
}
