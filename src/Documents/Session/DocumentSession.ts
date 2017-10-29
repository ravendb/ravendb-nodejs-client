import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird'
import {IDocumentSession, ISessionOperationOptions} from "./IDocumentSession";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentQueryBase, DocumentQuery} from "./DocumentQuery";
import {IDocumentStore} from '../IDocumentStore';
import {AdvancedSessionOperations} from './AdvancedSessionOperations';
import {RequestExecutor} from '../../Http/Request/RequestExecutor';
import {DocumentConventions, DocumentConstructor, IDocumentConversionResult, IStoredRawEntityInfo, DocumentType, IDocumentAssociationCheckResult} from '../Conventions/DocumentConventions';
import {AbstractCallback, EmptyCallback, EntityCallback, EntitiesArrayCallback} from '../../Typedef/Callbacks';
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
import {IRavenObject} from "../../Typedef/IRavenObject";
import {Serializer} from "../../Json/Serializer";
import {RequestMethods} from "../../Http/Request/RequestMethod";
import {IOptionsSet} from "../../Typedef/IOptionsSet";
import {ConcurrencyCheckMode, ConcurrencyCheckModes} from "../../Database/ConcurrencyCheckMode";

export class DocumentSession implements IDocumentSession {
  protected database: string;
  protected documentStore: IDocumentStore;
  protected sessionId: string;
  protected documentsById: IRavenObject<IRavenObject>;
  protected includedRawEntitiesById: IRavenObject<object>
  protected deletedDocuments: Set<IRavenObject>;
  protected knownMissingIds: Set<string>;
  protected deferCommands: Set<RavenCommandData>;
  protected rawEntitiesAndMetadata: Map<IRavenObject, IStoredRawEntityInfo>;
  protected requestExecutor: RequestExecutor;
  protected attachedQueries: WeakMap<DocumentQueryBase, boolean>;

  private _numberOfRequestsInSession: number = 0;
  private _advanced: AdvancedSessionOperations = null;

  public get numberOfRequestsInSession(): number {
    return this._numberOfRequestsInSession;
  }

  public get conventions(): DocumentConventions {
    return this.documentStore.conventions;
  }

  public get advanced(): AdvancedSessionOperations {
    if (!this._advanced) {
      this._advanced = new AdvancedSessionOperations(this, this.requestExecutor); 
    }

    return this._advanced;
  }

  constructor (dbName: string, documentStore: IDocumentStore, id: string, requestExecutor: RequestExecutor) {
    this.database = dbName;
    this.documentStore = documentStore;  
    this.sessionId = id;
    this.documentsById = {};
    this.includedRawEntitiesById = {};
    this.deletedDocuments = new Set<IRavenObject>();
    this.rawEntitiesAndMetadata = new Map<IRavenObject, IStoredRawEntityInfo>();
    this.knownMissingIds = new Set<string>();
    this.deferCommands = new Set<RavenCommandData>();
    this.requestExecutor = requestExecutor;
    this.attachedQueries = new WeakMap<DocumentQueryBase, boolean>();
  }

  public async load<T extends Object = IRavenObject>(id: string, callback?: EntityCallback<T>): Promise<T>;
  public async load<T extends Object = IRavenObject>(id: string, options?: ISessionOperationOptions<T>, callback?: EntityCallback<T>): Promise<T>;
  public async load<T extends Object = IRavenObject>(ids: string[], callback?: EntityCallback<T>): Promise<T[]>;
  public async load<T extends Object = IRavenObject>(ids: string[], options?: ISessionOperationOptions<T>, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  public async load<T extends Object = IRavenObject>(idOrIds: string | string[], optionsOrCallback?: ISessionOperationOptions<T> | EntityCallback<T> | EntitiesArrayCallback<T>, callback?: EntityCallback<T> | EntitiesArrayCallback<T>): Promise<T | T[]> {
    let includes: string[] = null;
    let documentType: DocumentType<T> = null;
    let options: ISessionOperationOptions<T> = null;
    let nestedObjectTypes: IRavenObject<DocumentConstructor> = null;
    let loadCallback: EntityCallback<T> | EntitiesArrayCallback<T> = null;

    if (_.isEmpty(idOrIds)) {
      return BluebirdPromise.reject(new InvalidOperationException('Document ID isn\'t set or ids list is empty'));
    }

    if (TypeUtil.isObject(optionsOrCallback)) {
      options = <ISessionOperationOptions<T>>optionsOrCallback;
      
      includes = options.includes;
      documentType = options.documentType;
      nestedObjectTypes = options.nestedObjectTypes;
      loadCallback = options.callback;
    } else if (TypeUtil.isFunction(optionsOrCallback)) {
      loadCallback = <EntityCallback<T> | EntitiesArrayCallback<T>>optionsOrCallback;
    }

    if (!loadCallback && TypeUtil.isFunction(callback)) {
      loadCallback = callback;
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

        PromiseResolver.resolve<T | T[]>(result, null, loadCallback);
        return result;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, loadCallback));
  }

  public async delete<T extends Object = IRavenObject>(id: string, callback?: EntityCallback<T>): Promise<T>;
  public async delete<T extends Object = IRavenObject>(id: string, options?: ISessionOperationOptions<T>, callback?: EntityCallback<T>): Promise<T>;
  public async delete<T extends Object = IRavenObject>(document: T, callback?: EntityCallback<T>): Promise<T>;
  public async delete<T extends Object = IRavenObject>(document: T, options?: ISessionOperationOptions<T>, callback?: EntityCallback<T>): Promise<T>;
  public async delete<T extends Object = IRavenObject>(idOrDocument: string | T, optionsOrCallback?: ISessionOperationOptions<T> | EntityCallback<T>, callback?: EntityCallback<T>): Promise<void> {
    let deleteCallback: EntityCallback<T> = null;
    let expectedChangeVector: string = null;

    if (TypeUtil.isFunction(optionsOrCallback)) {
      deleteCallback = <EntityCallback<T>>optionsOrCallback;
    } else if (TypeUtil.isObject(optionsOrCallback)) {
      let options: ISessionOperationOptions<T> = <ISessionOperationOptions<T>>optionsOrCallback;

      expectedChangeVector = options.expectedChangeVector;
      deleteCallback = <EntityCallback<T>>options.callback;
    }

    if (!deleteCallback && TypeUtil.isFunction(callback)) {
      deleteCallback = callback;
    }

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

          if (!TypeUtil.isNull(expectedChangeVector)) {
            info.expectedChangeVector = expectedChangeVector;
            this.rawEntitiesAndMetadata.set(document, info);
          }

          this.deletedDocuments.add(document);
        }

        this.knownMissingIds.add(id);
        delete this.includedRawEntitiesById[id];
        PromiseResolver.resolve<T>(document || null, null, deleteCallback);
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, deleteCallback));
  }

  public async store<T extends Object = IRavenObject>(document: T, id?: string, callback?: EntityCallback<T>): Promise<T>;
  public async store<T extends Object = IRavenObject>(document: T, id?: string, options?: ISessionOperationOptions<T>, callback?: EntityCallback<T>): Promise<T>;
  public async store<T extends Object = IRavenObject>(document: T, id?: string, optionsOrCallback?: ISessionOperationOptions<T> | EntityCallback<T>, callback?: EntityCallback<T>): Promise<T> {
    let originalMetadata: object;
    let changeVector: string = null;
    let isNewDocument: boolean = false;
    let documentType: DocumentType<T> = null;
    let storeCallback: EntityCallback<T> = null;
    const conventions: DocumentConventions = this.conventions;

    if (TypeUtil.isObject(optionsOrCallback)) {
      let options: ISessionOperationOptions<T> = <ISessionOperationOptions<T>>optionsOrCallback;

      changeVector = options.expectedChangeVector;
      documentType = options.documentType;
      storeCallback = <EntityCallback<T>>options.callback;
    } else if (TypeUtil.isFunction(optionsOrCallback)) {
      storeCallback = <EntityCallback<T>>optionsOrCallback;
    }

    if (!storeCallback && TypeUtil.isFunction(callback)) {
      storeCallback = callback;
    }

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

        PromiseResolver.resolve<T>(document, null, storeCallback);
        return document;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, storeCallback));
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
        if (TypeUtil.isNull(results)) {
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
    return DocumentQuery.create<T>(this, this.requestExecutor, options);
  }

  public attachQuery<T extends Object = IRavenObject>(query: DocumentQueryBase<T>): void {
    if (this.attachedQueries.has(query)) {
      throw new InvalidOperationException('Query is already attached to session');
    }

    query.on(
      DocumentQueryBase.EVENT_DOCUMENTS_QUERIED,
      () => this.incrementRequestsCount()
    );

    query.on<IDocumentConversionResult<T>>(
      DocumentQueryBase.EVENT_DOCUMENT_FETCHED,
      (conversionResult?: IDocumentConversionResult<T>) =>
        this.onDocumentFetched<T>(conversionResult)
    );

    query.on<object[]>(
      DocumentQueryBase.EVENT_INCLUDES_FETCHED,
      (includes: object[]) =>
        this.onIncludesFetched(includes)
    );

    this.attachedQueries.set(query, true);
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
      .execute(new GetDocumentCommand(ids, false, includes))
      .then((response: IRavenResponse): T[] | BluebirdPromise.Thenable<T[]> => {
        let responseResults: object[] = [];
        let responseIncludes: object[] = [];
        const commandResponse: IRavenResponse = response;
        const conventions: DocumentConventions = this.documentStore.conventions;

        if (commandResponse) {
          responseResults = conventions.tryFetchResults(commandResponse);
          responseIncludes = conventions.tryFetchIncludes(commandResponse);
        }

        const results: T[] = responseResults.map((result: object, index: number) => {
          if (TypeUtil.isNull(result)) {
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

        Serializer.fromJSON<T>(<T>document, source || {}, _.omit(document['@metadata'] || {},
            ['@collection', 'Raven-Node-Type', '@nested_object_types']), {}, conventions);
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

          if (TypeUtil.isNull(documentId)) {
            documentId = conventions.getIdFromDocument<T>(document, <DocumentType<T>>info.documentType);
          }

          if (TypeUtil.isNull(changeVector)) {
            checkMode = ConcurrencyCheckModes.Disabled;
          } else {
            info.changeVector = metadata['@change-vector'] = changeVector;

            if (!TypeUtil.isNull(documentId)) {
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

        if (TypeUtil.isNull(documentId)) {
          documentId = conventions.getIdFromDocument<T>(document);
        }

        if (!TypeUtil.isNull(documentId)) {
          conventions.setIdOnDocument(document, documentId);

          document['@metadata']['@id'] = documentId;
        }

        if (!TypeUtil.isNull(documentId) && !documentId.endsWith('/') && (documentId in this.documentsById)) {
          if (!(new Set<IRavenObject>([this.documentsById[documentId]]).has(document))) {
            return BluebirdPromise.reject(new NonUniqueObjectException(StringUtil.format(
              "Attempted to associate a different object with id '{0}'.", documentId
            )));
          }
        }

        if (TypeUtil.isNull(documentId) || documentId.endsWith('/')) {
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

          if (!TypeUtil.isNull(info.expectedChangeVector)) {
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