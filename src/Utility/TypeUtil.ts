import * as _ from "lodash";

export type ObjectTypeDescriptor = ObjectConstructor | ObjectLiteralTypeChecker;

export interface ObjectConstructor extends Function { 
    new(...args: any[]): any; 
    name: string;
}

export abstract class ObjectLiteralTypeChecker {
    public abstract name: string;
    public abstract isType(obj: Object);
}

export abstract class ObjectLiteralUniquePropsTypeChecker extends ObjectLiteralTypeChecker {
    // if it quacks like a duck...

    public abstract name: string;
    public abstract properties: string[];

    public isType(obj: Object) {
        return this._hasProperties(obj);
    } 
    
    private _hasProperties(obj: Object): boolean {
        return this.properties.reduce((result, property) => {
            return result && obj.hasOwnProperty(property);
        }, true);
    }
}

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

  public static isDocumentConstructor(value: any): boolean {
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

  public static hasType(obj: Object, typeDescriptor: ObjectTypeDescriptor) {
    return ("isType" in typeDescriptor && typeDescriptor.isType(obj)) 
      || obj.constructor.name === typeDescriptor.name;
  }
}