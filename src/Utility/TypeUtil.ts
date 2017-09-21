import * as _ from 'lodash';

export class TypeUtil {
  public static readonly MAX_INT32 = 2147483647;

  public static isNull(value: any): boolean {
    return ('undefined' === (typeof value)) || _.isNull(value);
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
    return _.isFunction(value) && ('name' in value)
      && ('Object' !== value.name);
  }

  public static isDate(value: any): boolean {
    return _.isDate(value);
  }

  public static isBool(value: any): boolean {
    return _.isBoolean(value);
  }
}