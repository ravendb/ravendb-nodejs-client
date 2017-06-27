import {InvalidOperationException, ArgumentNullException} from "../../Database/DatabaseExceptions";
import * as pluralize from 'pluralize';
import {SortOption, SortOptions} from "../../Database/Indexes/SortOption";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import * as _ from 'lodash';
import {Serializer} from "../../Json/Serializer";
import {IRavenObject} from "../../Database/IRavenObject";
import {ConcurrencyCheckMode} from "../../Database/ConcurrencyCheckMode";

export type DocumentConstructor<T extends Object = IRavenObject> = { new(...args: any[]): T; };
export type DocumentType<T extends Object = IRavenObject> = DocumentConstructor<T> | string;

export interface IDocumentInfoResolvable {
  resolveConstructor?: (typeName: string) => DocumentConstructor;
  resolveIdProperty?: (typeName: string, ctor?: DocumentConstructor) => string;
}

export interface IDocumentConversionResult<T extends Object = IRavenObject> {
  rawEntity?: object,
  document: T;
  metadata: object;
  originalMetadata: object;
  documentType: DocumentType<T>;
}

export interface IStoredRawEntityInfo {
  originalValue: object;
  metadata: object;
  originalMetadata: object;
  key: string;
  etag?: number | null;
  expectedEtag?: number | null;
  concurrencyCheckMode: ConcurrencyCheckMode;
  documentType: DocumentType;
}

export class DocumentConventions {
  readonly maxNumberOfRequestPerSession: number = 30;
  readonly requestTimeout: number = 30;
  readonly defaultUseOptimisticConcurrency:boolean = false;
  readonly maxLengthOfQueryUsingGetUrl = 1024 + 512;
  readonly identityPartsSeparator = "/";
  private _disableTopologyUpdates: boolean = false;
  private _resolvers: IDocumentInfoResolvable[] = [];
  private _idsNamesCache: Map<string, string> = new Map<string, string>();
  private _ctorsCache: Map<string, DocumentConstructor> = new Map<string, DocumentConstructor>();

  public get emptyEtag(): number {
    return 0;
  }

  public get topologyUpdatesEnabled(): boolean {
    return !this._disableTopologyUpdates;
  } 

  public addDocumentInfoResolver(resolver: IDocumentInfoResolvable): void {
    if (!resolver) {
      throw new ArgumentNullException('Invalid resolver provided');
    }

    this._resolvers.push(resolver);
  }

  public disableTopologyUpdates(): void {
    this._disableTopologyUpdates = true;
  }

  public enableTopologyUpdates(): void {
    this._disableTopologyUpdates = false;
  }
  
  public getCollectionName(documentType: DocumentType): string {
    return pluralize(this.getDocumentTypeName(documentType));
  }

  public getDocumentTypeName(documentType: DocumentType): string {
    return TypeUtil.isString(documentType)
      ? <string>documentType 
      : (<DocumentConstructor>documentType).name;
  }

  public getDocumentConstructor<T extends Object = IRavenObject>(documentType?: DocumentType<T>): DocumentConstructor<T> | null {
    const typeName: string = <string>documentType;
    let foundCtor: DocumentConstructor<T>;

    if (!documentType) {
      return null;
    }  

    if (TypeUtil.isFunction(documentType)) {
      return documentType as DocumentConstructor<T>;      
    }

    if (this._ctorsCache.has(typeName)) {
      foundCtor = <DocumentConstructor<T>>this._ctorsCache.get(typeName);
    } else {
      for (let resolver of this._resolvers) {
        try {
          foundCtor = <DocumentConstructor<T>>resolver.resolveConstructor(typeName);
        } catch (exception) {
          foundCtor = null;
        }

        if (!TypeUtil.isNone(foundCtor)) {
          this._ctorsCache.set(typeName, foundCtor);
          break;
        }
      }
    }

    return foundCtor;
  }

  public getIdPropertyName<T extends Object = IRavenObject>(documentType?: DocumentType<T>): string {
    let typeName: string = <string>documentType;
    let foundIdPropertyName: string;
    let ctor: DocumentConstructor<T> = <DocumentConstructor<T>>documentType;

    if (TypeUtil.isFunction(ctor)) {
      typeName = ctor.name;
    } else {
      ctor = null;
    }

    if (this._idsNamesCache.has(typeName)) {
      foundIdPropertyName = this._idsNamesCache.get(typeName);
    } else {
      for (let resolver of this._resolvers) {
        try {
          foundIdPropertyName = resolver.resolveIdProperty(typeName, ctor);
        } catch (exception) {
          foundIdPropertyName = null;
        }

        if (!TypeUtil.isNone(foundIdPropertyName)) {
          this._idsNamesCache.set(typeName, foundIdPropertyName);
          break;
        }
      }
    }
    
    return foundIdPropertyName || 'id';
  }

  public convertToDocument<T extends Object = IRavenObject>(rawEntity: object, documentType?: DocumentType<T>, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): IDocumentConversionResult<T> {
    const metadata: object = _.get(rawEntity, '@metadata') || {};
    const originalMetadata: object = _.cloneDeep(metadata);
    const docType: DocumentType<T> = documentType || metadata['Raven-Node-Type'];
    const docCtor: DocumentConstructor<T> = this.getDocumentConstructor(documentType);
    const idProperty: string = this.getIdPropertyName(docType);
    
    const documentAttributes: object = _.omit(rawEntity, '@metadata');
    let document: T = Serializer.fromJSON<T>(
      documentType ? new docCtor : ({} as T),
      documentAttributes, metadata, nestedObjectTypes, this
    );

    this.setIdOnDocument(
      document, metadata
      ['@id'] || null, docType
    );

    return {
      rawEntity: rawEntity,
      document: document as T,
      metadata: metadata,
      originalMetadata: originalMetadata,
      documentType: documentType
    } as IDocumentConversionResult<T>;
  }

  public convertToRawEntity<T extends Object = IRavenObject>(document: T): object {
    return Serializer.toJSON<T>(document, document['@metadata'] || {});
  }

  public setIdOnDocument<T extends Object = IRavenObject>(document: T, key: string, documentType?: DocumentType<T>): T {
    const docType: DocumentType<T> = documentType || this.getTypeFromDocument(document);
    const idProperty = this.getIdPropertyName(docType);

    if ('object' !== (typeof document)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement object interface");
    }

    document[idProperty] = key;
    return document;
  }

  public getIdFromDocument<T extends Object = IRavenObject>(document?: T, documentType?: DocumentType<T>): string {
    const docType: DocumentType<T> = documentType || this.getTypeFromDocument(document);
    const idProperty = this.getIdPropertyName(docType);

    if (!document) {
      throw new InvalidOperationException("Empty entity provided.");
    }

    if (!document.hasOwnProperty(idProperty)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement object interface");
    }

    return document[idProperty] || (document['@metadata'] || {})['@id'] || null;
  }

  public getTypeFromDocument<T extends Object = IRavenObject>(document?: T): DocumentType<T> {
    let docType: DocumentType<T> = <DocumentConstructor<T>>document.constructor;
    
    if ('Object' === docType.name) {
      docType = document['@metadata']['Raven-Node-Type'];
    }

    return docType;
  }

  public buildDefaultMetadata<T extends Object = IRavenObject>(entity: T, documentType: DocumentType<T>): object {
    let metadata: object = {};
    let nestedTypes: object = {};
    let property: string, value : any;

    const findNestedType = (property, value: any): void => {
      if (value instanceof Date) {
        nestedTypes[property] = Date.name;
      } else if (TypeUtil.isObject(value)) {
        let documentType: string = value.constructor.name;

        if ('Object' !== documentType) {
          nestedTypes[property] = documentType;
        }
      }
    };
    
    if (entity) {
      _.assign(metadata, entity['@metadata'] || {}, {
        '@collection': this.getCollectionName(documentType),
        'Raven-Node-Type': TypeUtil.isString(documentType)
          ? StringUtil.capitalize(documentType as string)
          : (documentType as DocumentConstructor<T>).name
      });

      for (property in entity) {
        
        if (entity.hasOwnProperty(property)) {
          value = entity[property];

          if (Array.isArray(value)) {
            value.length && findNestedType(property, _.first(value));
          } else {
            findNestedType(property, value);
          }
        }
      }

      if (!_.isEmpty(nestedTypes)) {
        metadata['@nested_object_types'] = nestedTypes;
      }
    }

    return metadata;
  }

  public usesRangeType(queryFilterValue: any): boolean {
    return TypeUtil.isNumber(queryFilterValue);
  }

  public rangedFieldName(fieldName: string, queryFilterValue: any): string {
    if (TypeUtil.isNumber(queryFilterValue)) {
      return StringUtil.format(
        '{0}_{1}_Range', fieldName,
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