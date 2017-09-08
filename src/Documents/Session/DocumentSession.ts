import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird'
import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentQuery} from "./DocumentQuery";
import {IDocumentStore} from '../IDocumentStore';
import {RequestExecutor} from '../../Http/Request/RequestExecutor';
import {DocumentConventions, DocumentConstructor, IDocumentConversionResult, IStoredRawEntityInfo, DocumentType, IDocumentAssociationCheckResult} from '../Conventions/DocumentConventions';
import {EmptyCallback, EntityCallback, EntitiesArrayCallback} from '../../Typedef/Callbacks';
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
import {IRavenObject} from "../../Typedef/IRavenObject";
import {Serializer} from "../../Json/Serializer";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {ConcurrencyCheckMode, ConcurrencyCheckModes} from "../../Database/ConcurrencyCheckMode";

export class DocumentSession implements IDocumentSession {
  protected database: string;
  protected documentStore: IDocumentStore;
  protected requestExecutor: RequestExecutor;
  protected sessionId: string;
  protected documentsById: IRavenObject<IRavenObject>;
  protected includedRawEntitiesById: IRavenObject<object>
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
    this.includedRawEntitiesById = {};
    this.deletedDocuments = new Set<IRavenObject>();
    this.rawEntitiesAndMetadata = new Map<IRavenObject, IStoredRawEntityInfo>();
    this.knownMissingIds = new Set<string>();
    this.deferCommands = new Set<RavenCommandData>();
  }

  public async load<T extends Object = IRavenObject>(idOrIds: string, documentType?: DocumentType<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntityCallback<T>): Promise<T>;
  public async load<T extends Object = IRavenObject>(idOrIds: string[], documentType?: DocumentType<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  public async load<T extends Object = IRavenObject>(idOrIds: string | string[], documentType?: DocumentType<T>, includes?: string[], nestedObjectTypes: IRavenObject<DocumentConstructor> = {}, callback?: EntityCallback<T>
    | EntitiesArrayCallback<T>
  ): Promise<T | T[]> {
    if (_.isEmpty(idOrIds)) {
      return BluebirdPromise.reject(new InvalidOperationException('Document ID isn\'t set or ids list is empty'));
    }

    const loadingOneDoc: boolean = !TypeUtil.isArray(idOrIds); 
    const ids: string[] = loadingOneDoc ? [<string>idOrIds] : <string[]>idOrIds;
    let idsOfNonExistingDocuments: Set<string> = new Set<string>(ids);

    if (includes && !TypeUtil.isArray(includes)) {
      includes = _.isString(includes) ? [includes as string] : null;
    }

    if (!includes) {
      const conventions: DocumentConventions = this.documentStore.conventions;

      Array.from<string>(idsOfNonExistingDocuments)
        .filter((id: string): boolean => id 
          in this.includedRawEntitiesById
        )
        .forEach((id: string) => {
          this.makeDocument(
            this.includedRawEntitiesById[id], 
            documentType, nestedObjectTypes
          );

          delete this.includedRawEntitiesById[id];
      });

      idsOfNonExistingDocuments = new Set<string>(
        Array.from<string>(idsOfNonExistingDocuments)
          .filter((id: string): boolean => !(id in this.documentsById)
      ));  
    }

    idsOfNonExistingDocuments = new Set<string>(
      Array.from<string>(idsOfNonExistingDocuments)
        .filter((id: string): boolean => !this.knownMissingIds.has(id)
    ));
   
    return BluebirdPromise.resolve()   
      .then((): BluebirdPromise.Thenable<void | T[]> => {
        if (idsOfNonExistingDocuments.size) {
          return this.fetchDocuments<T>(
            Array.from<string>(idsOfNonExistingDocuments), 
            documentType, includes, nestedObjectTypes
          );
        }
      })
      .then((): T[] => ids.map((id: string): T => (!this.knownMissingIds.has(id) 
        && (id in this.documentsById)) ? this.documentsById[id] as T : null 
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

  public async delete<T extends Object = IRavenObject>(idOrDocument: string, expectedChangeVector?: string, callback?: EmptyCallback): Promise<void>;
  public async delete<T extends Object = IRavenObject>(idOrDocument: T, expectedChangeVector?: string, callback?: EmptyCallback): Promise<void>;
  public async delete<T extends Object = IRavenObject>(idOrDocument: string | T, expectedChangeVector?: string, callback?: EmptyCallback): Promise<void> {
    return BluebirdPromise.resolve()
      .then(() => {
        const conventions = this.conventions;
        let info: IStoredRawEntityInfo;
        let id: string, document: T = null;
        let originalMetadata: object;

        if (TypeUtil.isString(idOrDocument)) {
            id = idOrDocument as string;

          if (idOrDocument in this.documentsById) {
            document = this.documentsById[id] as T;
            if (this.isDocumentChanged(document)) {
              return BluebirdPromise.reject(new InvalidOperationException('Can\'t delete changed document using identifier. Pass document instance instead'));
            }
          }
        } else {
          document = idOrDocument as T;
          info = this.rawEntitiesAndMetadata.get(document);
          id = conventions.getIdFromDocument<T>(document, <DocumentType<T>>info.documentType);
        }

        if (!document) {

            this.deferCommands.add(new DeleteCommandData(id, expectedChangeVector));
        } else {
          if (!this.rawEntitiesAndMetadata.has(document)) {
            return BluebirdPromise.reject(new InvalidOperationException('Document is not associated with the session, cannot delete unknown document instance'));
          }

          ({originalMetadata, id} = info);

          if ('Raven-Read-Only' in originalMetadata) {
            return BluebirdPromise.reject(new InvalidOperationException('Document is marked as read only and cannot be deleted'));
          }

          if (!TypeUtil.isNone(expectedChangeVector)) {
            info.expectedChangeVector = expectedChangeVector;
            this.rawEntitiesAndMetadata.set(document, info);
          }
            this.deletedDocuments.add(document);
        }

        this.knownMissingIds.add(id);
        delete this.includedRawEntitiesById[id];
        PromiseResolver.resolve<void>(null, null, callback);
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  public async store<T extends Object = IRavenObject>(document: T, id?: string, documentType?: DocumentType<T>, changeVector?: string, callback?: EntityCallback<T>): Promise<T> {
    let originalMetadata: object;
    let isNewDocument: boolean = false;
    const conventions: DocumentConventions = this.conventions;

    return this.checkDocumentAndMetadataBeforeStore<T>(document, id, documentType)
      .then((document: T) => this.checkAssociationAndChangeVectorBeforeStore<T>(document, id, changeVector))
      .then((result: IDocumentAssociationCheckResult<T>): T | BluebirdPromise.Thenable<T> => {
        let {isNew, document} = result;

        if (isNewDocument = isNew) {
          originalMetadata = _.cloneDeep(document['@metadata'] || {});
          return this.prepareDocumentIdBeforeStore<T>(document, id, changeVector);
        }  

        return document;
      })
      .then((document: T): T | BluebirdPromise.Thenable<T> => {   
        if (isNewDocument) {
          const id: string = conventions.getIdFromDocument(document);
          const docType: DocumentType<T> = conventions.getTypeFromDocument(document, id, documentType);

          for (let command of this.deferCommands.values()) {
            if (command.documentId === id) {
              return BluebirdPromise.reject(new InvalidOperationException(StringUtil.format(
                "Can't store document, there is a deferred command registered " + 
                "for this document in the session. Document id: {0}", id
              )));
            }
          }

          if (this.deletedDocuments.has(document)) {
            return BluebirdPromise.reject(new InvalidOperationException(StringUtil.format(
                "Can't store object, it was already deleted in this " + 
                "session. Document id: {0}", id
              )));
          }

          this.deletedDocuments.delete(document);
          document['@metadata'] = conventions.buildDefaultMetadata(document, docType);          
          this.onDocumentFetched<T>(<IDocumentConversionResult<T>>{
            document: document,
            metadata: document['@metadata'],
            originalMetadata: originalMetadata,
            rawEntity: conventions.convertToRawEntity(document, docType)
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
    let waitForNonStaleResults: boolean = null;
    let includes: string[] = null;
    let withStatistics: boolean = null;
    let indexName: string = null;
    let documentType: DocumentType<T> = null;
    let nestedObjectTypes: IRavenObject<DocumentConstructor> = {} as IRavenObject<DocumentConstructor>;
    let fromCollection: boolean = false;
    let queryParameters: object;

    if (options) {
      waitForNonStaleResults = options.WaitForNonStaleResults || null;
      includes = options.includes || null;
      withStatistics = options.withStatistics || null;
      nestedObjectTypes = options.nestedObjectTypes || {};
      indexName = options.indexName || null;
      documentType = options.documentType || null;
      fromCollection = options.fromCollection || false;
      queryParameters = options.queryParameters;
    }

    const query: DocumentQuery<T> = new DocumentQuery<T>(this, this.requestExecutor, documentType, indexName,
      waitForNonStaleResults, nestedObjectTypes, withStatistics, queryParameters
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

  protected fetchDocuments<T extends Object = IRavenObject>(ids: string[], documentType?: DocumentType<T>, includes?: string[], nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): BluebirdPromise<T[]> {
    this.incrementRequestsCount();

    return this.requestExecutor
      .execute(new GetDocumentCommand(ids))
      .then((response: IRavenResponse): T[] | BluebirdPromise.Thenable<T[]> => {
        let responseResults: object[] = [];
        let responseIncludes: object[] = [];
        const commandResponse: IRavenResponse = response;
        const conventions: DocumentConventions = this.documentStore.conventions;

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
            this.knownMissingIds.add(ids[index]);
            return null;
          }

          return this.makeDocument<T>(result, documentType, nestedObjectTypes);  
        });

        if (responseIncludes.length) {
          this.onIncludesFetched(responseIncludes);
        }

        return results;
      });
  }

  public checkDocumentAndMetadataBeforeStore<T extends Object = IRavenObject>(document?: object | T, id?: string, documentType?: DocumentType<T>): BluebirdPromise<T> {
    const conventions: DocumentConventions = this.documentStore.conventions;

    if (!document || !TypeUtil.isObject(document)) {
      return BluebirdPromise.reject(
        new InvalidOperationException('Document must be set and be an instance of object')
      ) as BluebirdPromise<T>;
    }

    if (!this.rawEntitiesAndMetadata.has(document)) {
      const docType: DocumentType<T> = conventions.getTypeFromDocument<T>(<T>document, id, documentType);
      const docCtor: DocumentConstructor<T> = conventions.getDocumentConstructor<T>(docType);

      if ('function' !== (typeof docType)) {
        let source: object = _.cloneDeep(<object>document);

        if (docCtor) {
          _.assign(<T>document, new docCtor(), {
            constructor: docCtor,
            __proto__: docCtor.prototype
          });
        }
        
        Serializer.fromJSON<T>(<T>document, source || {}, {}, {}, conventions);
      }

      document['@metadata'] = conventions.buildDefaultMetadata(document, docType);
    }
    
    return BluebirdPromise.resolve<T>(<T>document);
  }

  protected checkAssociationAndChangeVectorBeforeStore<T extends Object = IRavenObject>(document: T, id?: string, changeVector?: string): BluebirdPromise<IDocumentAssociationCheckResult<T>> {
    return BluebirdPromise.resolve()
      .then((): IDocumentAssociationCheckResult<T> => {
        const conventions: DocumentConventions = this.conventions;
        const store: IDocumentStore = this.documentStore;
        const isNew: boolean = !this.rawEntitiesAndMetadata.has(document);

        if (!isNew) {
          let info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);
          let metadata: object = document['@metadata'];
          let documentId: string = id;
          let checkMode: ConcurrencyCheckMode = ConcurrencyCheckModes.Forced;

          if (TypeUtil.isNone(documentId)) {
            documentId = conventions.getIdFromDocument<T>(document, <DocumentType<T>>info.documentType);
          } 

          if (TypeUtil.isNone(changeVector)) {
            checkMode = ConcurrencyCheckModes.Disabled;
          } else {
            info.changeVector = metadata['@change-vector'] = changeVector;

            if (!TypeUtil.isNone(documentId)) {
              checkMode = ConcurrencyCheckModes.Auto;
            }
          }

          info.concurrencyCheckMode = checkMode;
          this.rawEntitiesAndMetadata.set(document, info);
        }

        return {document, isNew};
      });
  }

  protected prepareDocumentIdBeforeStore<T extends Object = IRavenObject>(document: T, id?: string, changeVector?: string): BluebirdPromise<T> {
    return BluebirdPromise.resolve(document)
      .then((document: T) => {
        const conventions: DocumentConventions = this.conventions;
        const store: IDocumentStore = this.documentStore;

        let documentId: string = id;

        if (TypeUtil.isNone(documentId)) {
          documentId = conventions.getIdFromDocument<T>(document);
        } 
        
        if (!TypeUtil.isNone(documentId)) {
          conventions.setIdOnDocument(document, documentId);

          document['@metadata']['@id'] = documentId;
        }

        if (!TypeUtil.isNone(documentId) && !documentId.endsWith('/') && (documentId in this.documentsById)) {
            if (!(new Set<IRavenObject>([this.documentsById[documentId]]).has(document))) {
                return BluebirdPromise.reject(new NonUniqueObjectException(StringUtil.format(
                  "Attempted to associate a different object with id '{0}'.", documentId
                )));
            } 
        }

        if (TypeUtil.isNone(documentId) || documentId.endsWith('/')) {
          return store
            .generateId(document, conventions.getTypeFromDocument(document))
            .then((documentId: string): T => {
              conventions.setIdOnDocument(document, documentId);

              document['@metadata']['@id'] = documentId;
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

      let changeVector: string = null;
      const conventions: DocumentConventions = this.conventions;
      const info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);
      const id: string = info.id;
      const rawEntity: object = conventions.convertToRawEntity(document, info.documentType);

      if ((this.conventions.defaultUseOptimisticConcurrency && (ConcurrencyCheckModes.Disabled 
        !== info.concurrencyCheckMode)) || (ConcurrencyCheckModes.Forced === info.concurrencyCheckMode)
      ) {
        changeVector = info.changeVector || info.metadata['@change-vector'] || conventions.emptyChangeVector;
      }

      delete this.documentsById[id];
      changes.addDocument(document);
      changes.addCommand(new PutCommandData(id, _.cloneDeep(rawEntity), changeVector));
    }
  }

  protected prepareDeleteCommands(changes: SaveChangesData): void {
    this.deletedDocuments.forEach((document: IRavenObject) => {
      const id: string = this.rawEntitiesAndMetadata.get(document).id;
      let existingDocument: IRavenObject = null;
      let info: IStoredRawEntityInfo = null;
      let changeVector: string = null;

      if (id in this.documentsById) {
        existingDocument = this.documentsById[id];        

        if (this.rawEntitiesAndMetadata.has(existingDocument)) {
          info = this.rawEntitiesAndMetadata.get(existingDocument);

          if (!TypeUtil.isNone(info.expectedChangeVector)) {
            changeVector = info.expectedChangeVector;
          } else if (this.conventions.defaultUseOptimisticConcurrency) {
            changeVector = info.changeVector || info.metadata['@change-vector'];
          }

          this.rawEntitiesAndMetadata.delete(existingDocument);
        }

        delete this.documentsById[id];
      }

      changes.addDocument(existingDocument);
      changes.addCommand(new DeleteCommandData(id, changeVector));
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
            changeVector: commandResult['@change-vector'],
            metadata: metadata,
            originalValue: _.cloneDeep(this.conventions.convertToRawEntity(document, info.documentType)),
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
      
      return !_.isEqual(info.originalValue, this.conventions.convertToRawEntity(document, info.documentType))
        || !_.isEqual(info.originalMetadata, info.metadata);
    }

    return false;
  }

  protected makeDocument<T extends Object = IRavenObject>(commandResult: object, documentType?: DocumentType<T>, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): T {
     const conversionResult: IDocumentConversionResult<T> =  this.conventions
      .convertToDocument<T>(commandResult, documentType, nestedObjectTypes);

     this.onDocumentFetched<T>(conversionResult);  
     return conversionResult.document as T; 
  }

  protected onIncludesFetched(includes: object[]): void {
    if (includes && includes.length) {
      includes.forEach((include: object) => {
        const documentId: string = include["@metadata"]["@id"];

        if (!(documentId in this.documentsById)) {
          this.includedRawEntitiesById[documentId] = include;
        }
      });
    }
  }

  protected onDocumentFetched<T extends Object = IRavenObject>(conversionResult?: IDocumentConversionResult<T>): void {
    if (conversionResult) {
      const documentId: string = this.conventions
        .getIdFromDocument(conversionResult.document, conversionResult.documentType)
        || conversionResult.originalMetadata['@id'] || conversionResult.metadata['@id'];

      if (documentId) {
        this.knownMissingIds.delete(documentId);

        if (!(documentId in this.documentsById)) {
          let originalValueSource: object = conversionResult.rawEntity;

          if (!originalValueSource) {
            originalValueSource = this.conventions
              .convertToRawEntity<T>(conversionResult.document, conversionResult.documentType);
          }

          this.documentsById[documentId] = conversionResult.document;
          this.rawEntitiesAndMetadata.set(this.documentsById[documentId], {
            originalValue: _.cloneDeep(originalValueSource),
            originalMetadata: conversionResult.originalMetadata,
            metadata: conversionResult.metadata,
            changeVector: conversionResult.metadata['change-vector'] || null,
            id: documentId,
            concurrencyCheckMode: ConcurrencyCheckModes.Auto,
            documentType: conversionResult.documentType
          });
        }
      }
    }
  }
}