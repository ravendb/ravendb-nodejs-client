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

    public static isString(value: any): boolean {
        return _.isString(value);
    }

    public static isNumber(value: any): boolean {
        return _.isNumber(value);
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

    public static isClassConstructor(value: any): boolean {
        return _.isFunction(value) && ("name" in value)
            && ("Object" !== value.name);
    }

    public static isType(obj: object, typeDescriptor: DocumentType) {
        return ((typeDescriptor as ObjectLiteralDescriptor).isType
            && (typeDescriptor as ObjectLiteralDescriptor).isType(obj))
            || obj.constructor.name === (typeDescriptor as EntityConstructor).name;
    }

    public static isObjectLiteralTypeDescriptor(typeDescriptor: ObjectTypeDescriptor) {
        return !this.isClassConstructor(typeDescriptor)
            && (typeDescriptor as ObjectLiteralDescriptor).isType;
    }

    public static findType(obj: object, typeDescriptors: ObjectTypeDescriptor[]): ObjectTypeDescriptor {
        if (TypeUtil.isClassConstructor(obj.constructor)) {
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
}
