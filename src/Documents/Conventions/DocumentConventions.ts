import {InvalidOperationException} from "../../Database/DatabaseExceptions";
import * as pluralize from 'pluralize';
import {SortOption, SortOptions} from "../../Database/Indexes/SortOption";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import * as _ from 'lodash';
import {Serializer} from "../../Json/Serializer";

export type DocumentConstructor<T extends Object> = { new(): T; };

export interface INestedObjectTypes {
  [property: string]: DocumentConstructor<Object>
}

export interface IDocumentConversionResult<T extends Object> {
  document: T,
  metadata: Object,
  originalMetadata: Object
}

export class DocumentConventions {
  readonly maxNumberOfRequestPerSession: number = 30;
  readonly timeout: number = 30;
  readonly defaultUseOptimisticConcurrency:boolean = false;
  readonly maxLengthOfQueryUsingGetUrl = 1024 + 512;
  readonly identityPartsSeparator = "/";
  private _systemDatabase: string = "system";

  public get idPropertyName(): string {
    return 'id';
  }

  public get systemDatabase(): string {
    return this._systemDatabase;
  }

  public get emptyEtag(): number {
    return 0;
  }

  public getDocumentType(typeOrConstructor: string | DocumentConstructor<Object>): string {
    const documentType: string = TypeUtil.isString(typeOrConstructor)
      ? typeOrConstructor : typeOrConstructor.name;

    return documentType.toLowerCase();
  }

  public getDocumentsColleciton(typeOrConstructor: string | DocumentConstructor<Object>): string {
    return pluralize(this.getDocumentType(typeOrConstructor));
  }

  public tryGetObjectType<T extends Object>(objectType?: DocumentConstructor<T> | string): DocumentConstructor<T> | null {
    if (objectType && !TypeUtil.isString(objectType)) {
      return objectType as DocumentConstructor<T>;
    }

    return null;
  }

  public tryConvertToDocument<T extends Object>(rawEntity: Object, objectType?: DocumentConstructor<T>, nestedObjectTypes: INestedObjectTypes = {}): IDocumentConversionResult<T> {
    const metadata: Object = _.get(rawEntity, '@metadata') || {};
    const originalMetadata: Object = _.clone(metadata);
    const idProperty: string = this.idPropertyName;
    const documentAttributes: Object = _.omit(rawEntity, '@metadata');
    let document: T = Serializer.fromJSON<T>(
      objectType ? new objectType : ({} as T),
      documentAttributes, metadata, nestedObjectTypes
    );

    if (idProperty in document) {
      this.trySetIdOnEntity(document, metadata['@id'] || null);
    }

    return {
      document: document,
      metadata: metadata,
      originalMetadata: originalMetadata
    } as IDocumentConversionResult<T>;
  }

  public tryConvertToRawEntity<T extends Object>(document: T): Object {
    return Serializer.toJSON<T>(document, document['@metadata'] || {});
  }

  public trySetIdOnEntity<T extends Object>(entity: T, key: string): T {
    const idProperty = this.idPropertyName;

    if (!entity.hasOwnProperty(idProperty)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement Object interface");
    }

    entity[idProperty] = key;
    return entity;
  }

  public tryGetIdFromInstance<T extends Object>(entity?: T): string {
    const idProperty = this.idPropertyName;

    if (!entity) {
      throw new InvalidOperationException("Empty entity provided.");
    }

    if (!entity.hasOwnProperty(idProperty)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement Object interface");
    }

    return entity[idProperty];
  }

  public buildDefaultMetadata<T extends Object>(entity: T, typeOrConstructor: string | DocumentConstructor<Object>): Object {
    let metadata: Object = {};
    let nestedTypes: Object = {};
    let property: string, value : any;

    if (entity) {
      _.assign(metadata, entity['@metadata'] || {}, {
        '@collection': this.getDocumentsColleciton(typeOrConstructor),
        'Raven-Node-Type': TypeUtil.isString(typeOrConstructor)
          ? StringUtil.ucFirst(typeOrConstructor as string)
          : typeOrConstructor.name
      });

      for (property in entity) {
        if (entity.hasOwnProperty(property)) {
          value = entity[property];

          if (value instanceof Date) {
            nestedTypes[property] = Date.name;
          } else if (TypeUtil.isObject(value)) {
            let objectType: string = value.constructor.name;

            if ('Object' !== objectType) {
              nestedTypes[property] = objectType;
            }
          }
        }
      }

      if (!_.isEmpty(nestedTypes)) {
        metadata['@nested_object_types'] = nestedTypes;
      }
    }

    return metadata;
  }

  public tryGetTypeFromMetadata(metadata: Object): string | null {
    if ('Raven-Node-Type' in metadata) {
      return metadata['Raven-Node-Type'];
    }

    return null;
  }

  public usesRangeType(queryFilterValue: any): boolean {
    return TypeUtil.isNumber(queryFilterValue);
  }

  public rangedFieldName(fieldName: string, queryFilterValue: any): string {
    if (TypeUtil.isNumber(queryFilterValue)) {
      return StringUtil.format(
        '{1}_{0}_Range', fieldName,
        _.isInteger(queryFilterValue) ? 'L': 'D'
      );
    }

    return fieldName;
  }

  public getDefaultSortOption(queryFilterValue: any): SortOption | null {
    switch (typeof queryFilterValue) {
      case 'number':
        return SortOptions.Numeric;
      case 'string':
        return SortOptions.Str;
      default:
        return SortOptions.None;
    }
  }
}