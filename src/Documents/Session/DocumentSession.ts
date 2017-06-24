import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird'
import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentQuery} from "./DocumentQuery";
import {IDocumentStore} from '../IDocumentStore';
import {RequestExecutor} from '../../Http/Request/RequestExecutor';
import {DocumentConventions, DocumentConstructor, IDocumentConversionResult, IStoredRawEntityInfo} from '../Conventions/DocumentConventions';
import {EmptyCallback, EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import {PromiseResolver} from '../../Utility/PromiseResolver';
import {TypeUtil} from "../../Utility/TypeUtil";
import {InvalidOperationException, RavenException, NonUniqueObjectException} from "../../Database/DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {GetDocumentCommand} from "../../Database/Commands/GetDocumentCommand";
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {RavenCommandData} from "../../Database/RavenCommandData";
import {PutCommandData} from "../../Database/Commands/Data/PutCommandData";
import {DeleteCommandData} from "../../Database/Commands/Data/DeleteCommandData";
import {SaveChangesData} from "../../Database/Commands/Data/SaveChangesData";
import {QueryOperator} from "./QueryOperator";
import {IRavenObject} from "../../Database/IRavenObject";
import {Serializer} from "../../Json/Serializer";
import {RequestMethods} from "../../Http/Request/RequestMethod";

export class DocumentSession implements IDocumentSession {
  protected database: string;
  protected documentStore: IDocumentStore;
  protected requestExecutor: RequestExecutor;
  protected sessionId: string;
  protected documentsById: IRavenObject<IRavenObject>;
  protected includedRawEntitiesByKey: IRavenObject<object>
  protected deletedDocuments: Set<IRavenObject>;
  protected knownMissingIds: Set<string>;
  protected deferCommands: Set<RavenCommandData>;
  protected rawEntitiesAndMetadata: Map<IRavenObject, IStoredRawEntityInfo>;

  private _numberOfRequestsInSession: number = 0;

  public get numberOfRequestsInSession(): number {
    return this._numberOfRequestsInSession;
  }

  public get conventions(): DocumentConventions {
    return this.documentStore.conventions;
  }       

  constructor (database: string, documentStore: IDocumentStore, requestExecutor: RequestExecutor,
     sessionId: string
  ) {
    this.database = database;
    this.documentStore = documentStore;
    this.requestExecutor = requestExecutor;
    this.sessionId = sessionId;
    this.documentsById = {};
    this.includedRawEntitiesByKey = {};
    this.deletedDocuments = new Set<IRavenObject>();
    this.rawEntitiesAndMetadata = new Map<IRavenObject, IStoredRawEntityInfo>();
    this.knownMissingIds = new Set<string>();
    this.deferCommands = new Set<RavenCommandData>();
  }

  public create<T extends Object = IRavenObject>(attributesOrDocument?: object | T, documentTypeOrObjectType?: string | DocumentConstructor<T>, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): T {
    let document: T = attributesOrDocument as T;
    const conventions: DocumentConventions = this.documentStore.conventions;

    if (('object' === (typeof attributesOrDocument)) && ('Object' !== attributesOrDocument.constructor.name)) {
      documentTypeOrObjectType || (documentTypeOrObjectType = attributesOrDocument.constructor as DocumentConstructor<T>);
    } else {
      const objectType: DocumentConstructor<T> | null = conventions.getObjectType(documentTypeOrObjectType);
      
      document = objectType ? new objectType() : ({} as T);
      Serializer.fromJSON<T>(document, (attributesOrDocument as object) || {}, {}, nestedObjectTypes);
    }

    document['@metadata'] = conventions.buildDefaultMetadata(document, documentTypeOrObjectType);
    return document as T;
  }

  public async load<T extends Object = IRavenObject>(keyOrKeys: string, documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntityCallback<T>): Promise<T>;
  public async load<T extends Object = IRavenObject>(keyOrKeys: string[], documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  public async load<T extends Object = IRavenObject>(keyOrKeys: string | string[], documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes: IRavenObject<DocumentConstructor> = {}, callback?: EntityCallback<T>
    | EntitiesArrayCallback<T>
  ): Promise<T | T[]> {
    if (_.isEmpty(keyOrKeys)) {
      return BluebirdPromise.reject(new InvalidOperationException('Document key isn\'t set or keys list is empty'));
    }

    const loadingOneDoc: boolean = !TypeUtil.isArray(keyOrKeys); 
    const keys: string[] = loadingOneDoc ? [<string>keyOrKeys] : <string[]>keyOrKeys;
    let idsOfNonExistingDocuments: Set<string> = new Set<string>(keys);

    if (includes && !TypeUtil.isArray(includes)) {
      includes = _.isString(includes) ? [includes as string] : null;
    }

    if (!includes) {
      const conventions: DocumentConventions = this.documentStore.conventions;
      const objectType: DocumentConstructor<T> | null = conventions.getObjectType(documentTypeOrObjectType);

      Array.from<string>(idsOfNonExistingDocuments)
        .filter((key: string): boolean => key 
          in this.includedRawEntitiesByKey
        )
        .forEach((key: string) => {
          this.makeDocument(
            this.includedRawEntitiesByKey[key], 
            objectType, nestedObjectTypes
          );

          delete this.includedRawEntitiesByKey[key];
      });

      idsOfNonExistingDocuments = new Set<string>(
        Array.from<string>(idsOfNonExistingDocuments)
          .filter((key: string): boolean => !(key in this.documentsById)
      ));  
    }

    idsOfNonExistingDocuments = new Set<string>(
      Array.from<string>(idsOfNonExistingDocuments)
        .filter((key: string): boolean => !this.knownMissingIds.has(key)
    ));
   
    return BluebirdPromise.resolve()   
      .then((): BluebirdPromise.Thenable<void | T[]> => {
        if (idsOfNonExistingDocuments.size) {
          return this.fetchDocuments<T>(
            Array.from<string>(idsOfNonExistingDocuments), 
            documentTypeOrObjectType, includes, nestedObjectTypes
          );
        }
      })
      .then((): T[] => keys.map((key: string): T => (!this.knownMissingIds.has(key) 
        && (key in this.documentsById)) ? this.documentsById[key] as T : null 
      ))
      .then((results: T[]): T | T[] =>  {
        let result : T | T[] = results;

        if (loadingOneDoc) {
          result = _.first(results) as T;
        }
        
        PromiseResolver.resolve<T | T[]>(result, null, callback);
        return result;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  public async delete<T extends Object = IRavenObject>(keyOrDocument: string, callback?: EmptyCallback): Promise<void>;
  public async delete<T extends Object = IRavenObject>(keyOrDocument: T, callback?: EmptyCallback): Promise<void>;
  public async delete<T extends Object = IRavenObject>(keyOrDocument: string | T, callback?: EmptyCallback): Promise<void> {
    return BluebirdPromise.resolve()
      .then(() => {
        const conventions = this.conventions;
        let key: string, document: T = null;
        let originalMetadata: object;

        if (TypeUtil.isString(keyOrDocument)) { 
          key = keyOrDocument as string;

          if (keyOrDocument in this.documentsById) {
            document = this.documentsById[key] as T;

            if (this.isDocumentChanged(document)) {
              return BluebirdPromise.reject(new InvalidOperationException('Can\'t delete changed document using identifier. Pass document instance instead'));
            }
          }            
        } else {
          document = keyOrDocument as T;
          key = conventions.getIdFromInstance<T>(document);
        }

        if (!document) {
          this.deferCommands.add(new DeleteCommandData(key));
        } else {
          if (!this.rawEntitiesAndMetadata.has(document)) {
            return BluebirdPromise.reject(new InvalidOperationException('Document is not associated with the session, cannot delete unknown document instance'));
          }

          ({originalMetadata, key} = this.rawEntitiesAndMetadata.get(document));

          if ('Raven-Read-Only' in originalMetadata) {
            return BluebirdPromise.reject(new InvalidOperationException('Document is marked as read only and cannot be deleted'));
          }

          this.deletedDocuments.add(document);
        }

        this.knownMissingIds.add(key);
        PromiseResolver.resolve<void>(null, null, callback); 
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  public async store<T extends Object = IRavenObject>(document: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean,
     callback?: EntityCallback<T>
  ): Promise<T> {
    let originalMetadata: object;
    let isNewDocument: boolean = false;
    const conventions: DocumentConventions = this.conventions;

    return this.checkDocumentAndEtagBeforeStore<T>(document, key, etag, forceConcurrencyCheck)
      .then((isNew: boolean): T | BluebirdPromise.Thenable<T> => {
        if (isNewDocument = isNew) {
          originalMetadata = _.cloneDeep(document['@metadata'] || {});
          return this.prepareDocumentIdBeforeStore<T>(document, key, etag, forceConcurrencyCheck);
        }  

        return document;
      })
      .then((document: T): T | BluebirdPromise.Thenable<T> => {      
        if (isNewDocument) {
          const key: string = conventions.getIdFromInstance(document);

          for (let command of this.deferCommands.values()) {
            if (command.documentKey === key) {
              return BluebirdPromise.reject(new InvalidOperationException(StringUtil.format(
                "Can't store document, there is a deferred command registered " + 
                "for this document in the session. Document id: {0}", key
              )));
            }
          }

          if (this.deletedDocuments.has(document)) {
            return BluebirdPromise.reject(new InvalidOperationException(StringUtil.format(
                "Can't store object, it was already deleted in this " + 
                "session. Document id: {0}", key
              )));
          }

          this.deletedDocuments.delete(document);
          document['@metadata'] = conventions.buildDefaultMetadata(document, document.constructor as DocumentConstructor<T>);          
          this.onDocumentFetched<T>(<IDocumentConversionResult<T>>{
            document: document,
            metadata: document['@metadata'],
            originalMetadata: originalMetadata,
            rawEntity: conventions.convertToRawEntity(document)
          });
        }

        PromiseResolver.resolve<T>(document, null, callback);
        return document;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  public async saveChanges(callback?: EmptyCallback): Promise<void> {
    const changes: SaveChangesData = new SaveChangesData(
      Array.from<RavenCommandData>(this.deferCommands),
      this.deferCommands.size
    );

    this.deferCommands.clear();
    this.prepareDeleteCommands(changes);
    this.prepareUpdateCommands(changes);

    if (!changes.commandsCount) {
      return Promise.resolve();
    }

    return this.requestExecutor
      .execute(changes.createBatchCommand())
      .then((results?: IRavenResponse[]) => {
        if (TypeUtil.isNone(results)) {
          return BluebirdPromise.reject(new InvalidOperationException(
            "Cannot call Save Changes after the document store was disposed."
          ));
        }

        this.processBatchCommandResults(results, changes);
        PromiseResolver.resolve<void>(null, null, callback);
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  public query<T extends Object = IRavenObject>(options?: IDocumentQueryOptions<T>): IDocumentQuery<T> {
    let usingDefaultOperator: QueryOperator = null;
    let waitForNonStaleResults: boolean = null;
    let includes: string[] = null;
    let withStatistics: boolean = null;
    let indexName: string = null;
    let documentTypeOrObjectType: string | DocumentConstructor<T> = null;
    let nestedObjectTypes: IRavenObject<DocumentConstructor> = {} as IRavenObject<DocumentConstructor>;

    if (options) {
      usingDefaultOperator = options.usingDefaultOperator || null;
      waitForNonStaleResults = options.waitForNonStaleResults || null;
      includes = options.includes || null;
      withStatistics = options.withStatistics || null;
      nestedObjectTypes = options.nestedObjectTypes || {};
      indexName = options.indexName || null;
      documentTypeOrObjectType = options.documentTypeOrObjectType || null;
    }

    const query: DocumentQuery<T> = new DocumentQuery<T>(this, this.requestExecutor, documentTypeOrObjectType, indexName,
      usingDefaultOperator, waitForNonStaleResults, includes, nestedObjectTypes, withStatistics
    );

    query.on(
      DocumentQuery.EVENT_DOCUMENTS_QUERIED, 
      () => this.incrementRequestsCount()      
    );

    query.on<IDocumentConversionResult<T>>(
      DocumentQuery.EVENT_DOCUMENT_FETCHED, 
      (conversionResult?: IDocumentConversionResult<T>) => 
      this.onDocumentFetched<T>(conversionResult)
    );

    query.on<object[]>(
      DocumentQuery.EVENT_INCLUDES_FETCHED, 
      (includes: object[]) => 
      this.onIncludesFetched(includes)
    );

    return query;
  }

  protected incrementRequestsCount(): void {
    const maxRequests: number = this.conventions.maxNumberOfRequestPerSession;

    this._numberOfRequestsInSession++;

    if (this._numberOfRequestsInSession > maxRequests) {
      throw new InvalidOperationException(StringUtil.format(
        "The maximum number of requests ({0}) allowed for this session has been reached. Raven limits the number \
of remote calls that a session is allowed to make as an early warning system. Sessions are expected to \
be short lived, and Raven provides facilities like batch saves (call saveChanges() only once) \
You can increase the limit by setting DocumentConvention.\
MaxNumberOfRequestsPerSession or MaxNumberOfRequestsPerSession, but it is advisable \
that you'll look into reducing the number of remote calls first, \
since that will speed up your application significantly and result in a\
more responsive application.", maxRequests
      ));
    }
  }

  protected fetchDocuments<T extends Object = IRavenObject>(keys: string[], documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): BluebirdPromise<T[]> {
    this.incrementRequestsCount();

    return this.requestExecutor
      .execute(new GetDocumentCommand(keys, includes))
      .then((response: IRavenResponse): T[] | BluebirdPromise.Thenable<T[]> => {
        let responseResults: object[] = [];
        let responseIncludes: object[] = [];
        const commandResponse: IRavenResponse = response;
        const conventions: DocumentConventions = this.documentStore.conventions;
        const objectType: DocumentConstructor<T> | null = conventions.getObjectType(documentTypeOrObjectType);

        if (commandResponse) { 
          if (('Results' in commandResponse) && Array.isArray(commandResponse.Results)) {
            responseResults = <object[]>commandResponse.Results || [];
          }

          if (('Includes' in commandResponse) && Array.isArray(commandResponse.Includes)) {
            responseIncludes = commandResponse.Includes;
          }
        }

        const results: T[] = responseResults.map((result: object, index: number) => {
          if (TypeUtil.isNone(result)) {
            this.knownMissingIds.add(keys[index]);
            return null;
          }

          return this.makeDocument<T>(result, objectType, nestedObjectTypes);  
        });

        if (responseIncludes.length) {
          this.onIncludesFetched(responseIncludes);
        }

        return results;
      });
  }

  protected checkDocumentAndEtagBeforeStore<T extends Object = IRavenObject>(document: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean): BluebirdPromise<boolean> {
    if (!document || !TypeUtil.isObject(document)) {
      return BluebirdPromise.reject(
        new InvalidOperationException('Document must be set and be an instance of object')
      ) as BluebirdPromise<boolean>;
    }

    return BluebirdPromise.resolve()
      .then((): boolean => {
        const conventions: DocumentConventions = this.conventions;
        const store: IDocumentStore = this.documentStore;
        const isNew: boolean = !this.rawEntitiesAndMetadata.has(document);

        if (!isNew) {
          let info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);
          let metadata: object = document['@metadata'];

          if (!TypeUtil.isNone(etag)) {
            info.etag = metadata['@etag'] = etag;
          }

          info.forceConcurrencyCheck = forceConcurrencyCheck;
          this.rawEntitiesAndMetadata.set(document, info);
        }

        return isNew;
      });
  }

  protected prepareDocumentIdBeforeStore<T extends Object = IRavenObject>(document: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean): BluebirdPromise<T> {
    return BluebirdPromise.resolve(document)
      .then((document: T) => {
        const conventions: DocumentConventions = this.conventions;
        const store: IDocumentStore = this.documentStore;

        let documentKey: string = key;

        if (TypeUtil.isNone(documentKey)) {
          documentKey = conventions.getIdFromInstance<T>(document);
        } 
        
        if (!TypeUtil.isNone(documentKey)) {
          conventions.setIdOnEntity(document, documentKey);
          document['@metadata']['@id'] = documentKey;
        }

        if (!TypeUtil.isNone(documentKey) && !documentKey.endsWith('/') && (documentKey in this.documentsById)) {
            if (!(new Set<IRavenObject>([this.documentsById[documentKey]]).has(document))) {
                return BluebirdPromise.reject(new NonUniqueObjectException(StringUtil.format(
                  "Attempted to associate a different object with id '{0}'.", documentKey
                )));
            } 
        }

        if (TypeUtil.isNone(documentKey)) {
          return store
            .generateId(document, document.constructor as DocumentConstructor<T>)
            .then((documentKey: string): T => {
              conventions.setIdOnEntity(document, documentKey);
              document['@metadata']['@id'] = documentKey;

              return document;
            });
        }

        return document;
      });
  }

  protected prepareUpdateCommands(changes: SaveChangesData): void {
    for (let document of this.rawEntitiesAndMetadata.keys()) {
      if (!this.isDocumentChanged(document)) {
        continue;
      }

      let etag: number = null;
      const conventions: DocumentConventions = this.conventions;
      const info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);
      const key: string = info.key;
      const rawEntity: object = _.omit(conventions.convertToRawEntity(document), conventions.idPropertyName);

      if (this.conventions.defaultUseOptimisticConcurrency || info.forceConcurrencyCheck) {
        etag = info.etag || info.metadata['@etag'] || conventions.emptyEtag;
      }

      delete this.documentsById[key];
      changes.addDocument(document);
      changes.addCommand(new PutCommandData(key, _.cloneDeep(rawEntity), etag));
    }
  }

  protected prepareDeleteCommands(changes: SaveChangesData): void {
    this.deletedDocuments.forEach((document: IRavenObject) => {
      const key: string = this.rawEntitiesAndMetadata.get(document).key;
      let existingDocument: IRavenObject = null;
      let etag: number = null;

      if (key in this.documentsById) {
        existingDocument = this.documentsById[key];

        if (this.conventions.defaultUseOptimisticConcurrency && 
          this.rawEntitiesAndMetadata.has(existingDocument)
        ) {
          etag = this.rawEntitiesAndMetadata.get(existingDocument).metadata['@etag'];
        }

        this.rawEntitiesAndMetadata.delete(existingDocument);
        delete this.documentsById[key];
      }

      changes.addDocument(existingDocument);
      changes.addCommand(new DeleteCommandData(key, etag));
    });

    this.deletedDocuments.clear();
  }

  protected processBatchCommandResults(results: IRavenResponse[], changes: SaveChangesData): void {
    for (let index: number = changes.deferredCommandsCount; index < results.length; index++) {
      const commandResult: IRavenObject = results[index];

      if (RequestMethods.Put === commandResult.Type) {
        const document: IRavenObject = changes.getDocument(index - changes.deferredCommandsCount);

        if (this.rawEntitiesAndMetadata.has(document)) {
          const metadata: object = _.omit(commandResult, 'Type');
          const info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);

          _.assign(info, {
            etag: commandResult['@etag'],
            metadata: metadata,
            originalValue: _.cloneDeep(this.conventions.convertToRawEntity(document)),
            originalMetadata: _.cloneDeep(metadata)
          });

          this.documentsById[commandResult['@id']] = document;
          this.rawEntitiesAndMetadata.set(document, info);
        }
      } 
    }
  }

  protected isDocumentChanged<T extends Object = IRavenObject>(document: T): boolean {
    if (this.rawEntitiesAndMetadata.has(document)) {
      const info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);
      
      return !_.isEqual(info.originalValue, this.conventions.convertToRawEntity(document))
        || !_.isEqual(info.originalMetadata, info.metadata);
    }

    return false;
  }

  protected makeDocument<T extends Object = IRavenObject>(commandResult: object, objectType?: DocumentConstructor<T>, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): T {
     const conversionResult: IDocumentConversionResult<T> =  this.conventions
      .convertToDocument<T>(commandResult, objectType, nestedObjectTypes);

     this.onDocumentFetched<T>(conversionResult);  
     return conversionResult.document as T; 
  }

  protected onIncludesFetched(includes: object[]): void {
    if (includes && includes.length) {
      includes.forEach((include: object) => {
        const documentKey: string = include["@metadata"]["@id"];

        if (!(documentKey in this.documentsById)) {
          this.includedRawEntitiesByKey[documentKey] = include;
        }
      });
    }
  }

  protected onDocumentFetched<T extends Object = IRavenObject>(conversionResult?: IDocumentConversionResult<T>, forceConcurrencyCheck: boolean = false): void {
    if (conversionResult) {
      const documentKey: string = this.conventions
        .getIdFromInstance(conversionResult.document)
        || conversionResult.originalMetadata['@id']
        || conversionResult.metadata['@id'];

      if (documentKey) {
        this.knownMissingIds.delete(documentKey);

        if (!(documentKey in this.documentsById)) {
          let originalValueSource: object = conversionResult.rawEntity;

          if (!originalValueSource) {
            originalValueSource = this.conventions
              .convertToRawEntity<T>(conversionResult.document);
          }

          this.documentsById[documentKey] = conversionResult.document;
          this.rawEntitiesAndMetadata.set(this.documentsById[documentKey], {
            originalValue: _.cloneDeep(originalValueSource),
            originalMetadata: conversionResult.originalMetadata,
            metadata: conversionResult.metadata,
            etag: conversionResult.metadata['etag'] || null,
            key: documentKey,
            forceConcurrencyCheck: forceConcurrencyCheck
          });
        }
      }
    }
  }
}