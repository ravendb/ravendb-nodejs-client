import { IRavenObject } from "../Types/IRavenObject";
import { ConcurrencyCheckMode } from "./Session/IDocumentSession";
import { ClassConstructor, ObjectLiteralDescriptor } from "../Types";

export interface EntityConstructor<T extends Object = IRavenObject> 
    extends ClassConstructor {
    new(...args: any[]): T;
    name: string;
}

export type DocumentType<T extends Object = IRavenObject> = 
    EntityConstructor<T> | ObjectLiteralDescriptor | string;
