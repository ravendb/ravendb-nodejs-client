import { ObjectTypeDescriptor } from "../../Types";


export interface IHiLoIdGenerator {
    generateNextIdFor(database: string, collectionName: string): Promise<number>;
    generateNextIdFor(database: string, documentType: ObjectTypeDescriptor): Promise<number>;
    generateNextIdFor(database: string, entity: object): Promise<number>;
}
