import {TypeUtil} from "../Utility/TypeUtil";

export class Serializer {
  public static fromJSON<T extends Object>(className: { new(): T; }, source: Object | string, target?: T)
  {
    let sourceObject: Object = TypeUtil.isString(source)
      ? JSON.parse(source as string) : source;

    let targetObject: T = (target instanceof className)
      ? target : new className();

    const transform: (value: any) => any = (value) => {
      if (TypeUtil.isArray(value)) {
        return value.map((item) => transform(item))
      }

      if (value instanceof Object) {
        return this.fromJSON<T>(className, value);
      }

      return value;
    };

    Object.keys(sourceObject).forEach((key: string) => {
      let source: any = sourceObject[key];

      if ('undefined' !== (typeof source)) {
        targetObject[key] = transform(source);
      }
    });

    return targetObject;
  }
}