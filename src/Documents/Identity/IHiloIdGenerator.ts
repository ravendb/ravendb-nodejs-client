export interface IHiloIdGenerator {
  nextId(...args: Array<object | string | string>): Promise<string>;
  returnUnusedRange(): Promise<void>;
}
