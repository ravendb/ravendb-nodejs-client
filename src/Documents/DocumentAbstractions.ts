import { IRavenObject } from "../Types/IRavenObject";
import { ConcurrencyCheckMode } from "./Session/IDocumentSession";
import { ClassConstructor, ObjectLiteralDescriptor } from "../Types";

export interface EntityConstructor<T extends object = object> 
    extends ClassConstructor {
    new(...args: any[]): T;
    name: string;
}

export type DocumentType<T extends object = object> = 
    EntityConstructor<T> | ObjectLiteralDescriptor | string;
