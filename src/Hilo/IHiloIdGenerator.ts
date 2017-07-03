import * as BluebirdPromise from 'bluebird';

export interface IHiloIdGenerator {
  generateDocumentId(...args: (object | string | string)[]): BluebirdPromise<string>;
  returnUnusedRange(): BluebirdPromise<void>;
}
