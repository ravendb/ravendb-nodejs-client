export interface IHiloIdGenerator {
  generateDocumentId(...args: Array<object | string | string>): Promise<string>;
  returnUnusedRange(): Promise<void>;
}
