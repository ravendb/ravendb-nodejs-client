import {IDocument, DocumentKey, IDocumentType, DocumentConstructor} from '../IDocument';
import {InvalidOperationException} from "../../Database/DatabaseExceptions";
import * as pluralize from 'pluralize';
import {IMetadata} from "../../Database/Metadata";
import {SortOption, SortOptions} from "../../Database/Indexes/SortOption";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import * as _ from 'lodash';
import {Serializer} from "../../Json/Serializer";

export interface IDocumentConversionResult<T extends IDocument> {
  document: T,
  metadata: IMetadata,
  originalMetadata: IMetadata
}

export class DocumentConventions<T extends IDocument> {
  readonly maxNumberOfRequestPerSession: number = 30;
  readonly maxIdsToCatch: number = 32;
  readonly timeout: number = 30;
  readonly defaultUseOptimisticConcurrency:boolean = false;
  readonly maxLengthOfQueryUsingGetUrl = 1024 + 512;
  readonly identityPartsSeparator = "/";
  private _systemDatabase: string = "system";
  private _documentEntityClass: DocumentConstructor<T>;

  constructor(documentEntityClass: DocumentConstructor<T>) {
    this._documentEntityClass = documentEntityClass;
  }

  public get documentClass(): string {
    return this._documentEntityClass.name;
  }

  public get defaultDocumentType(): IDocumentType {
     return this.getDocumentType();
  }

  public get defaultCollection(): string {
    return this.getDocumentsColleciton();
  }

  public get documentIdPropertyName(): string {
    return 'id';
  }

  public get systemDatabase(): string {
    return this._systemDatabase;
  }

  public get emptyEtag(): number {
    return 0;
  }

  public getDocumentType(type?: IDocumentType): IDocumentType {
    return (type || this.documentClass).toLowerCase();
  }

  public getDocumentsColleciton(type?: IDocumentType): string {
    return pluralize(this.getDocumentType(type));
  }

  public tryConvertToDocument(rawEntity: Object): IDocumentConversionResult<T> {
    const metadata: IMetadata = _.get(rawEntity, '@metadata') || {};
    const originalMetadata: IMetadata = _.clone(metadata);
    const idProperty: string = this.documentIdPropertyName;
    const documentClass: DocumentConstructor<T> = this._documentEntityClass;
    const documentAttributes = _.omit(rawEntity, '@metadata');
    let document: T = new documentClass(documentAttributes, metadata);

    if (idProperty in document) {
      this.trySetIdOnEntity(document, metadata['@id'] || null);
    }

    return {
      document: document,
      metadata: metadata,
      originalMetadata: originalMetadata
    } as IDocumentConversionResult<T>;
  }

  public tryConvertToRawEntity(document: T): Object {
    return Serializer.toJSON<T>(
      this._documentEntityClass, document,
      document['@metadata'] || {}
    );
  }

  public trySetIdOnEntity(entity: T, key: DocumentKey): T {
    const idProperty = this.documentIdPropertyName;

    if (!entity.hasOwnProperty(idProperty)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement IDocument interface");
    }

    entity[idProperty] = key;
    return entity;
  }

  public tryGetIdFromInstance(entity?: T): DocumentKey {
    const idProperty = this.documentIdPropertyName;

    if (!entity) {
      throw new InvalidOperationException("Empty entity provided.");
    }

    if (!entity.hasOwnProperty(idProperty)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement IDocument interface");
    }

    return entity[idProperty];
  }

  public buildDefaultMetadata(entity?: T, documentType?: IDocumentType): IMetadata {
    let metadata: IMetadata = {};
    let nestedTypes: Object = {};
    let property: string, value : any;

    if (entity) {
      _.assign(metadata, entity['@metadata'] || {}, {
        '@collection': this.getDocumentsColleciton(documentType),
        '@object_type': this.getDocumentType(documentType),
        'Raven-Node-Type': this.defaultDocumentType
      });

      for (property in entity) {
        if (entity.hasOwnProperty(property)) {
          value = entity[property];

          if (value instanceof Date) {
            nestedTypes[property] = Date.name;
          }
        }
      }

      if (!_.isEmpty(nestedTypes)) {
        metadata['@nested_object_types'] = nestedTypes;
      }
    }

    return metadata;
  }

  public tryGetTypeFromMetadata(metadata: IMetadata): string | null {
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