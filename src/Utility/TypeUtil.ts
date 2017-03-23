export class TypeUtil {
  public static isNone(value: any): boolean {
    return ('undefined' === (typeof value)) || (null === value);
  }
}