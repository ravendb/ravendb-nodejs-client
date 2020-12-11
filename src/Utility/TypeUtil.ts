import { DocumentType } from "../Documents/DocumentAbstractions";
import { ObjectLiteralDescriptor, ObjectTypeDescriptor, ClassConstructor, EntityConstructor } from "../Types";

export class TypeUtil {
    public static readonly MAX_INT32 = 2147483647;
    public static readonly MIN_INT32 = -2147483648;

    // tslint:disable-next-line:no-empty
    public static NOOP: (...args: any[]) => any = () => {};

    public static ASYNC_NOOP: (...args: any[]) => Promise<any> = () => Promise.resolve(undefined);

    public static isNullOrUndefined(value: any): boolean {
        return ("undefined" === (typeof value)) || value === null;
    }

    public static isUndefined(value: any): boolean {
        return typeof value === "undefined";
    }

    public static isString(value: any): value is string {
        return typeof(value) === "string";
    }

    public static isNumber(value: any): value is number {
        return typeof(value) === "number";
    }

    public static isPrimitive(value: any): value is number | string | boolean {
        return TypeUtil.isNumber(value)
            || TypeUtil.isString(value)
            || TypeUtil.isBool(value);
    }

    public static isPrimitiveType(type: any): boolean {
        return type === Number ||
            type === String ||
            type === Boolean;
    }

    public static isArray<T = any>(value: any): value is T[] {
        return Array.isArray(value);
    }

    public static isObject(value: any): value is object {
        return value
            && typeof(value) === "object"
            && !this.isArray(value);
    }

    public static isFunction(value: any): value is Function {
        return typeof(value) === "function";
    }

    public static isDate(value: any): value is Date {
        return value && value.constructor.name === "Date";
    }

    public static isBool(value: any): value is boolean {
        return value === true || value === false;
    }

    public static isClass(value: any): boolean {
        return this.isFunction(value) && ("name" in value) && value.name !== ""
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
        if (!obj) {
            return null;
        }

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
