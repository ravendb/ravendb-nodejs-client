import { IRavenObject } from "../Types/IRavenObject";
import { ConcurrencyCheckMode } from "./Session/IDocumentSession";
import { ClassConstructor, ObjectLiteralDescriptor, EntityConstructor } from "../Types";

export type DocumentType<T extends object = object> = 
    EntityConstructor<T> | ObjectLiteralDescriptor<T> | string;
