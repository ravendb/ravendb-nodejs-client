import {TypeUtil} from "../Utility/TypeUtil";
import {DateUtil} from "../Utility/DateUtil";
import {ArrayUtil} from "../Utility/ArrayUtil";
import {DocumentConstructor} from "../Documents/Conventions/DocumentConventions";
import {IRavenObject} from "../Database/IRavenObject";

export class Serializer {
  public static fromJSON<T extends Object = IRavenObject>(target: T, source: Object | string, metadata: Object = {}, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): T
  {
    let sourceObject: Object = TypeUtil.isString(source)
      ? JSON.parse(source as string) : source;

    const mapping: Object = metadata && metadata['@nested_object_types']
      ? metadata['@nested_object_types'] : {};

    const transform: (value: any, key?: string) => any = (value, key) => {
      let nestedObjectConstructor: DocumentConstructor;

      if ((key in mapping) && (Date.name === mapping[key])) {
          return DateUtil.parse(value);
      }

      if (TypeUtil.isObject(value)) {
        let nestedObject: Object = {};

        if ((key in nestedObjectTypes) && (nestedObjectConstructor = nestedObjectTypes[key])
          && (!(key in mapping) || (nestedObjectConstructor.name === mapping[key]))) {
          nestedObject = new nestedObjectConstructor();
        }

        return this.fromJSON<Object>(nestedObject, value, value['@metadata'] || {});
      }

      if (TypeUtil.isArray(value)) {
        return value.map((item: any): any => transform(item, key))
      }

      return value;
    };

    Object.keys(sourceObject).forEach((key: string) => {
      let source: any = sourceObject[key];

      if ('undefined' !== (typeof source)) {
        target[key] = transform(source, key);
      }
    });

    target['@metadata'] = metadata || {};
    return target;
  }

  public static toJSON<T extends Object = IRavenObject>(source: T, metadata: Object = {}): Object
  {
    const mapping: Object = metadata && metadata['@nested_object_types']
      ? metadata['@nested_object_types'] : {};

    const transform: (value: any, key?: string) => any = (value, key) => {
      if ('@metadata' === key) {
        return value;
      }

      if ((key in mapping) && (Date.name === mapping[key]) && (value instanceof Date)) {
        return DateUtil.stringify(value);
      }

      if (TypeUtil.isObject(value)) {
        return this.toJSON<Object>(value, value['@metadata'] || {});
      }

      if (TypeUtil.isArray(value)) {
        return value.map((item: any): any => transform(item, key))
      }

      return value;
    };

    return ArrayUtil.mapObject(source, (item: any, key: string): any => transform(item, key));
  }
}