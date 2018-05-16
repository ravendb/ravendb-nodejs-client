import { 
    EntityConstructor 
} from "../Documents/DocumentAbstractions";
import * as _ from "lodash";
import { DocumentType } from "../Documents/DocumentAbstractions";
import { ObjectLiteralDescriptor, ObjectTypeDescriptor, ClassConstructor } from "../Types";

export class TypeUtil {
    public static readonly MAX_INT32 = 2147483647;

    // tslint:disable-next-line:no-empty
    public static NOOP: (...args: any[]) => any = () => {};

    public static isNullOrUndefined(value: any): boolean {
        return ("undefined" === (typeof value)) || value === null;
    }

    public static isUndefined(value: any): boolean {
        return typeof value === "undefined";
    }

    public static isString(value: any): boolean {
        return _.isString(value);
    }

    public static isNumber(value: any): boolean {
        return _.isNumber(value);
    }
    
    public static isPrimitive(value: any): boolean {
        return TypeUtil.isNumber(value)
            || TypeUtil.isString(value)
            || TypeUtil.isBool(value);
    }

    public static isArray(value: any): boolean {
        return _.isArray(value);
    }

    public static isObject(value: any): boolean {
        return _.isObject(value) && !this.isArray(value);
    }

    public static isFunction(value: any): boolean {
        return _.isFunction(value);
    }

    public static isObjectConstructor(value: any): boolean {
        return _.isFunction(value) && ("name" in value)
            && ("Object" !== value.name);
    }

    public static isDate(value: any): boolean {
        return _.isDate(value);
    }

    public static isBool(value: any): boolean {
        return _.isBoolean(value);
    }

    public static isClass(value: any): boolean {
        return _.isFunction(value) && ("name" in value)
            && ("Object" !== value.name)
            && (!!value.prototype && !!value.prototype.constructor.name);
    }

    public static isObjectTypeDescriptor(value: any): boolean {
        return !!value 
            && typeof value !== "string"
            && (this.isClass(value) || this.isObjectLiteralTypeDescriptor(value));

    }

    public static isType(obj: object, typeDescriptor: DocumentType) {
        if (!typeDescriptor) {
            return false;
        }

        return obj
            && ((typeDescriptor as ObjectLiteralDescriptor).isType
            && (typeDescriptor as ObjectLiteralDescriptor).isType(obj))
                || (obj && obj.constructor.name === (typeDescriptor as EntityConstructor).name);
    }

    public static isObjectLiteralTypeDescriptor(typeDescriptor: ObjectTypeDescriptor) {
        return typeDescriptor
            && !this.isClass(typeDescriptor)
            && typeof (typeDescriptor as ObjectLiteralDescriptor).isType === "function";
    }

    public static findType(obj: object, typeDescriptors: ObjectTypeDescriptor[]): ObjectTypeDescriptor {
        if (TypeUtil.isClass(obj.constructor)) {
            return obj.constructor as ClassConstructor;
        }

        for (const typeDescriptor of typeDescriptors) {
            if (!TypeUtil.isObjectLiteralTypeDescriptor(typeDescriptor)) {
                return;
            }

            if (TypeUtil.isType(obj, typeDescriptor as ObjectLiteralDescriptor)) {
                return typeDescriptor;
            }
        }

        return null;
    }

    public static isInstanceOf(type: ObjectTypeDescriptor, typeToCheck: ObjectTypeDescriptor) {
        return TypeUtil.isClass(type)
            && TypeUtil.isClass(typeToCheck)
            && type instanceof (typeToCheck as ClassConstructor);
    }
    
    public static isSet(obj: any) {
        return obj
            && obj.constructor
            && obj.constructor.name === "Set";
    }

    public static isMap(obj: any) {
        return obj
            && obj.constructor
            && obj.constructor.name === "Map";
    }

    public static isDocumentType<TEntity>(obj: any) {
        return obj && (this.isString(obj) ||
            this.isObjectTypeDescriptor(obj));
    }
}
