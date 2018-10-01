import { DocumentConventions } from "../Conventions/DocumentConventions";

export interface IHiloIdGenerator {
    //TODO ? nextId(...args: Array<object | string | string>): Promise<number>;
    generateDocumentId(...args: any[]): Promise<string>;

    returnUnusedRange(): Promise<void>;
}
