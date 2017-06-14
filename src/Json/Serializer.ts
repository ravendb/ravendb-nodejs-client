import * as _ from "lodash";
import {TypeUtil} from "../Utility/TypeUtil";
import {DateUtil} from "../Utility/DateUtil";
import {ArrayUtil} from "../Utility/ArrayUtil";
import {DocumentConstructor} from "../Documents/Conventions/DocumentConventions";
import {IRavenObject} from "../Database/IRavenObject";

export class Serializer {
  public static fromJSON<T extends Object = IRavenObject>(target: T, source: object | string, metadata: object | null = {}, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): T {
    let mapping: object = {};

    let sourceObject: object = TypeUtil.isString(source)
      ? JSON.parse(source as string) : source;
    
    const prepareMappings: (objectTypes: object) => void = (objectTypes: object): void => {
      for (let key in objectTypes) {
        let objectType: Function | DocumentConstructor | string;
        let existingObjectType: Function | DocumentConstructor | string;
      
        if ((objectType = objectTypes[key]) && (!(key in mapping) 
          || (('string' === (typeof (existingObjectType = mapping[key]))) 
          && ('function' === (typeof objectType)) 
          && (existingObjectType === (<Function>objectType).name))
        )) {
          mapping[key] = objectType;
        }
      }
    };
    
    const transform: (value: any, key?: string) => any = (value, key) => {
      let nestedObjectConstructor: DocumentConstructor = null;
      let nestedObject: IRavenObject = {};

      if ((key in mapping) && ('function' === (typeof (nestedObjectConstructor = mapping[key])))) {
        if (nestedObjectConstructor === Date) {
          return DateUtil.parse(value)
        }
      }

      if (TypeUtil.isObject(value)) {
        if (nestedObjectConstructor) {
          nestedObject = new nestedObjectConstructor();
        }

        return this.fromJSON<typeof nestedObject>(
          nestedObject, value, (key in mapping)  
          ? value['@metadata'] || {} : null
        );
      }

      if (TypeUtil.isArray(value)) {
        return value.map((item: any): any => transform(item, key))
      }

      return value;
    };

    if (metadata && metadata['@nested_object_types']) {
      prepareMappings(metadata['@nested_object_types']);
    }

    
    if (nestedObjectTypes && _.size(nestedObjectTypes)) {
      prepareMappings(nestedObjectTypes);
    }
  
    Object.keys(sourceObject).forEach((key: string) => {
      let source: any = sourceObject[key];

      if ('undefined' !== (typeof source)) {
        target[key] = transform(source, key);
      }
    });

    if (!TypeUtil.isNone(metadata)) {
      target['@metadata'] = metadata || {};
    }
    
    return target;
  }

  public static toJSON<T extends Object = IRavenObject>(source: T, metadata: object = {}): object {
    const mapping: object = metadata && metadata['@nested_object_types']
      ? metadata['@nested_object_types'] : {};

    const transform: (value: any, key?: string) => any = (value, key) => {
      if ('@metadata' === key) {
        return value;
      }

      if (value instanceof Date) {
        return DateUtil.stringify(value);
      }

      if (TypeUtil.isObject(value)) {
        return this.toJSON<IRavenObject>(value, value['@metadata'] || {});
      }

      if (TypeUtil.isArray(value)) {
        return value.map((item: any): any => transform(item, key))
      }

      return value;
    };

    return ArrayUtil.mapObject(source, (item: any, key: string): any => transform(item, key));
  }
}