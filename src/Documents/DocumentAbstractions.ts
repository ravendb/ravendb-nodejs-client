import { ObjectLiteralDescriptor, EntityConstructor } from "../Types";

export type DocumentType<T extends object = object> =
    EntityConstructor<T> | ObjectLiteralDescriptor<T> | string;
