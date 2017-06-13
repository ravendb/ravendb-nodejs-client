import {InvalidOperationException} from "../../Database/DatabaseExceptions";
import * as pluralize from 'pluralize';
import {SortOption, SortOptions} from "../../Database/Indexes/SortOption";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import * as _ from 'lodash';
import {Serializer} from "../../Json/Serializer";
import {IRavenObject} from "../../Database/IRavenObject";

export type DocumentConstructor<T extends Object = IRavenObject> = { new(): T; };

export interface IDocumentConversionResult<T extends Object = IRavenObject> {
  rawEntity?: object,
  document: T;
  metadata: object;
  originalMetadata: object;
}

export interface IStoredRawEntityInfo {
  originalValue: object;
  metadata: object;
  originalMetadata: object;
  key: string;
  etag?: number | null;
  forceConcurrencyCheck: boolean;
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

  public getDocumentType(typeOrConstructor: string | DocumentConstructor): string {
    const documentType: string = TypeUtil.isString(typeOrConstructor)
      ? typeOrConstructor as string : (typeOrConstructor as DocumentConstructor).name;

    return documentType.toLowerCase();
  }

  public getDocumentsColleciton(typeOrConstructor: string | DocumentConstructor): string {
    return pluralize(this.getDocumentType(typeOrConstructor));
  }

  public getObjectType<T extends Object = IRavenObject>(objectType?: DocumentConstructor<T> | string): DocumentConstructor<T> | null {
    if (objectType && !TypeUtil.isString(objectType)) {
      return objectType as DocumentConstructor<T>;
    }

    return null;
  }

  public convertToDocument<T extends Object = IRavenObject>(rawEntity: object, objectType?: DocumentConstructor<T>, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): IDocumentConversionResult<T> {
    const metadata: object = _.get(rawEntity, '@metadata') || {};
    const originalMetadata: object = _.cloneDeep(metadata);
    const idProperty: string = this.idPropertyName;
    const documentAttributes: object = _.omit(rawEntity, '@metadata');
    let document: T = Serializer.fromJSON<T>(
      objectType ? new objectType : ({} as T),
      documentAttributes, metadata, nestedObjectTypes
    );

    if (idProperty in document) {
      this.setIdOnEntity(document, metadata['@id'] || null);
    }

    return {
      rawEntity: rawEntity,
      document: document as T,
      metadata: metadata,
      originalMetadata: originalMetadata
    } as IDocumentConversionResult<T>;
  }

  public convertToRawEntity<T extends Object = IRavenObject>(document: T): object {
    return Serializer.toJSON<T>(document, document['@metadata'] || {});
  }

  public setIdOnEntity<T extends Object = IRavenObject>(entity: T, key: string): T {
    const idProperty = this.idPropertyName;

    if (!entity.hasOwnProperty(idProperty)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement object interface");
    }

    entity[idProperty] = key;
    return entity;
  }

  public getIdFromInstance<T extends Object = IRavenObject>(entity?: T): string {
    const idProperty = this.idPropertyName;

    if (!entity) {
      throw new InvalidOperationException("Empty entity provided.");
    }

    if (!entity.hasOwnProperty(idProperty)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement object interface");
    }

    return entity[idProperty] || (entity['@metadata'] || {})[idProperty] || null;
  }

  public buildDefaultMetadata<T extends Object = IRavenObject>(entity: T, typeOrConstructor: string | DocumentConstructor<T>): object {
    let metadata: object = {};
    let nestedTypes: object = {};
    let property: string, value : any;

    if (entity) {
      _.assign(metadata, entity['@metadata'] || {}, {
        '@collection': this.getDocumentsColleciton(typeOrConstructor),
        'Raven-Node-Type': TypeUtil.isString(typeOrConstructor)
          ? StringUtil.capitalize(typeOrConstructor as string)
          : (typeOrConstructor as DocumentConstructor<T>).name
      });

      for (property in entity) {
        if (entity.hasOwnProperty(property)) {
          value = entity[property];

          if (value instanceof Date) {
            nestedTypes[property] = Date.name;
          } else if (TypeUtil.isObject(value)) {
            let objectType: string = value.constructor.name;

            if ('object' !== objectType) {
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

  public getTypeFromMetadata(metadata: object): string | null {
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