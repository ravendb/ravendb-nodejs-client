import * as _ from 'lodash';
import * as pluralize from 'pluralize';
import {InvalidOperationException, ArgumentNullException} from "../../Database/DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {TypeUtil} from "../../Utility/TypeUtil";
import {Serializer} from "../../Json/Serializer";
import {IRavenObject} from "../../Typedef/IRavenObject";
import {ConcurrencyCheckMode} from "../../Database/ConcurrencyCheckMode";

export type DocumentConstructor<T extends Object = IRavenObject> = { new(...args: any[]): T; };
export type DocumentType<T extends Object = IRavenObject> = DocumentConstructor<T> | string;

export interface IDocumentInfoResolvable {
  resolveConstructor?: (typeName: string) => DocumentConstructor;
  resolveIdProperty?: (typeName: string, document?: object | IRavenObject) => string;
  resolveDocumentType?: (plainDocument: object, id?: string, specifiedType?: DocumentType) => string;
}

export interface IDocumentConversionResult<T extends Object = IRavenObject> {
  rawEntity?: object,
  document: T;
  metadata: object;
  originalMetadata: object;
  documentType: DocumentType<T>;
}

export interface IDocumentAssociationCheckResult<T extends Object = IRavenObject> {
  document: T;
  isNew: boolean;
}

export interface IStoredRawEntityInfo {
  originalValue: object;
  metadata: object;
  originalMetadata: object;
  id: string;
  changeVector?: string | null;
  expectedChangeVector?: string | null;
  concurrencyCheckMode: ConcurrencyCheckMode;
  documentType: DocumentType;
}

export class DocumentConventions {
  readonly maxNumberOfRequestPerSession: number = 30;
  readonly requestTimeout: number = 30;
  readonly defaultUseOptimisticConcurrency:boolean = true;
  readonly maxLengthOfQueryUsingGetUrl = 1024 + 512;
  readonly identityPartsSeparator = "/";
  private _resolvers: IDocumentInfoResolvable[] = [];
  private _idsNamesCache: Map<string, string> = new Map<string, string>();
  private _ctorsCache: Map<string, DocumentConstructor> = new Map<string, DocumentConstructor>();
  
  public setIdOnlyIfPropertyIsDefined: boolean = false;
  public disableTopologyUpdates: boolean = false;

  public get emptyChangeVector(): string {
    return null;
  }

  public addDocumentInfoResolver(resolver: IDocumentInfoResolvable): void {
    if (!resolver) {
      throw new ArgumentNullException('Invalid resolver provided');
    }

    this._resolvers.push(resolver);
  }
  
  public getCollectionName(documentType: DocumentType): string {
    const typeName: string = this.getDocumentTypeName(documentType);

    return !typeName ? '@all_docs' : pluralize(typeName);
  }

  public getDocumentTypeName(documentType: DocumentType): string {
    return TypeUtil.isFunction(documentType)
      ? (<DocumentConstructor>documentType).name 
      : <string>documentType || null;
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

        if (!TypeUtil.isNull(foundCtor)) {
          this._ctorsCache.set(typeName, foundCtor);
          break;
        }
      }
    }

    return foundCtor;
  }

  public getIdPropertyName<T extends Object = IRavenObject>(documentType?: DocumentType<T>, document?: T | object): string {
    let typeName: string = <string>documentType;
    let foundIdPropertyName: string;

    if (TypeUtil.isFunction(documentType)) {
      typeName = (<DocumentConstructor<T>>documentType).name;
    }

    if (this._idsNamesCache.has(typeName)) {
      foundIdPropertyName = this._idsNamesCache.get(typeName);
    } else {
      for (let resolver of this._resolvers) {
        try {
          foundIdPropertyName = resolver.resolveIdProperty(typeName, document);
        } catch (exception) {
          foundIdPropertyName = null;
        }

        if (!TypeUtil.isNull(foundIdPropertyName)) {
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
    const docCtor: DocumentConstructor<T> = this.getDocumentConstructor(docType);

    const documentAttributes: object = _.omit(rawEntity, '@metadata');
    let document: T = Serializer.fromJSON<T>(
      docCtor ? new docCtor() : ({} as T),
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

  public convertToRawEntity<T extends Object = IRavenObject>(document: T, documentType?: DocumentType<T>): object {
    const idProperty: string = this.getIdPropertyName(documentType, document);
    let result: object = Serializer.toJSON<T>(document);

    if (idProperty) {
      delete result[idProperty];
    }

    return result;
  }

  public setIdOnDocument<T extends Object = IRavenObject>(document: T, id: string, documentType?: DocumentType<T>): T {
    if ('object' !== (typeof document)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement object interface");
    }

    let docType: DocumentType<T> = documentType || this.getTypeFromDocument(document);
    const idProperty = this.getIdPropertyName(docType, document);

    if (!this.setIdOnlyIfPropertyIsDefined || (idProperty in document)) {
      document[idProperty] = id;    
    }

    return document;
  }

  public getIdFromDocument<T extends Object = IRavenObject>(document?: T, documentType?: DocumentType<T>): string {
    const docType: DocumentType<T> = documentType || this.getTypeFromDocument(document);
    const idProperty = this.getIdPropertyName(docType, document);

    if (!document) {
      throw new InvalidOperationException("Empty entity provided.");
    }

    if (('Object' !== document.constructor.name) && !document.hasOwnProperty(idProperty)) {
      throw new InvalidOperationException("Invalid entity provided. It should implement object interface");
    }

    return document[idProperty] || (document['@metadata'] || {})['@id'] || null;
  }

  public getTypeFromDocument<T extends Object = IRavenObject>(document?: T, id?: string, documentType?: DocumentType<T>): DocumentType<T> {
    const metadata: object = document['@metadata'];
    
    if ('Object' !== document.constructor.name) {
      return <DocumentConstructor<T>>document.constructor;
    }

    if (documentType) {
      return documentType;
    }

    if (metadata) {
      if (metadata['Raven-Node-Type']) {
        return metadata['Raven-Node-Type'];
      }

      if (metadata['@collection'] && ('@empty' !== metadata['@collection'])) {
        return StringUtil.capitalize(pluralize.singular(metadata['@collection']));
      }
    }

    let foundDocType: DocumentType<T>;
    let matches: string[];
    
    for (let resolver of this._resolvers) {
      try {
        foundDocType = <DocumentType<T>>resolver.resolveDocumentType(<object>document, id, documentType);
      } catch (exception) {
        foundDocType = null;
      }

      if (foundDocType) {
        break;
      }
    }

    if (foundDocType) {
      return foundDocType;
    }

    if (id && (matches = /^(\w{1}[\w\d]+)\/\d*$/i.exec(id))) {
      return StringUtil.capitalize(pluralize.singular(matches[1]));
    }

    return null;
  }

  public buildDefaultMetadata<T extends Object = IRavenObject>(document: T, documentType: DocumentType<T>): object {
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
    
    if (document) {
      _.assign(metadata, document['@metadata'] || {}, {
        '@collection': this.getCollectionName(documentType),
        'Raven-Node-Type': TypeUtil.isFunction(documentType)
          ? (documentType as DocumentConstructor<T>).name
          : <string>documentType ? StringUtil.capitalize(<string>documentType) : null
      });

      for (property in document) {        
        if (document.hasOwnProperty(property)) {
          value = document[property];

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
}