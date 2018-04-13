import { 
    ObjectLiteralDescriptor, 
    ObjectTypeDescriptor, 
    EntityConstructor 
} from "../Documents/DocumentAbstractions";
import * as _ from "lodash";
import { DocumentType } from "../Documents/DocumentAbstractions";
import { ObjectLiteralDescriptor } from "..";

export class TypeUtil {
    public static readonly MAX_INT32 = 2147483647;

    public static isNull(value: any): boolean {
        return ("undefined" === (typeof value)) || _.isNull(value);
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
}
