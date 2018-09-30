export interface IHiloIdGenerator {
    //TODO ? nextId(...args: Array<object | string | string>): Promise<number>;
    generateDocumentId(...args: Array<object | string>): Promise<string>;

    returnUnusedRange(): Promise<void>;
}
