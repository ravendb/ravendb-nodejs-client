import {TypeUtil} from "../Utility/TypeUtil";
import {DateUtil} from "../Utility/DateUtil";
import {ArrayUtil} from "../Utility/ArrayUtil";

export class Serializer {
  public static fromJSON<T extends Object>(className: { new(): T; }, source: Object | string, metadata: Object = {}, target?: T)
  {
    let sourceObject: Object = TypeUtil.isString(source)
      ? JSON.parse(source as string) : source;

    let targetObject: T = (target instanceof className)
      ? target : new className();

    const mapping: Object = metadata && metadata['@nested_object_types']
      ? metadata['@nested_object_types'] : {};

    const transform: (value: any, key?: string) => any = (value, key) => {
      if (key in mapping) {
        switch (mapping[key]) {
          case Date.name:
            return DateUtil.parse(value);
        }
      }

      if (TypeUtil.isArray(value)) {
        return value.map((item: any): any => transform(item, key))
      }

      if (TypeUtil.isObject(value)) {
        return this.fromJSON<T>(className, value, value['@metadata'] || {});
      }

      return value;
    };

    Object.keys(sourceObject).forEach((key: string) => {
      let source: any = sourceObject[key];

      if ('undefined' !== (typeof source)) {
        targetObject[key] = transform(source, key);
      }
    });

    return targetObject;
  }

  public static toJSON<T extends Object>(className: { new(): T; }, source: T, metadata: Object = {})
  {
    const mapping: Object = metadata && metadata['@nested_object_types']
      ? metadata['@nested_object_types'] : {};

    const transform: (value: any, key?: string) => any = (value, key) => {
      if ('@metadata' === key) {
        return value;
      }

      if (key in mapping) {
        switch (mapping[key]) {
          case Date.name:
            if (value instanceof Date) {
              return DateUtil.stringify(value);
            }
            return value;
        }
      }

      if (value instanceof className) {
        return this.toJSON<T>(className, value, value['@metadata'] || {});
      }

      if (TypeUtil.isArray(value)) {
        return value.map((item: any): any => transform(item, key))
      }

      if (TypeUtil.isObject(value)) {
        return ArrayUtil.mapObject(value, transform);
      }

      return value;
    };

    return ArrayUtil.mapObject(source, (item: any, key: string): any => transform(item, key));
  }
}