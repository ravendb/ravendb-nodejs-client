import {TypeUtil} from "../Utility/TypeUtil";
import {DateUtil} from "../Utility/DateUtil";

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
        return value.map((item) => transform(item, key))
      }

      if (value instanceof Object) {
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
}