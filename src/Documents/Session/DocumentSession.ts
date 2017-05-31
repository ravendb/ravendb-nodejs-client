import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird'
import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentQuery} from "./DocumentQuery";
import {IDocumentStore} from '../IDocumentStore';
import {RequestsExecutor} from '../../Http/Request/RequestsExecutor';
import {DocumentConventions, DocumentConstructor, IDocumentConversionResult, IStoredRawEntityInfo} from '../Conventions/DocumentConventions';
import {EmptyCallback, EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import {PromiseResolver} from '../../Utility/PromiseResolver';
import {TypeUtil} from "../../Utility/TypeUtil";
import {InvalidOperationException, DocumentDoesNotExistsException, RavenException} from "../../Database/DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {GetDocumentCommand} from "../../Database/Commands/GetDocumentCommand";
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {RavenCommandData} from "../../Database/RavenCommandData";
import {DeleteDocumentCommand} from "../../Database/Commands/DeleteDocumentCommand";
import {PutDocumentCommand} from "../../Database/Commands/PutDocumentCommand";
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
  protected requestsExecutor: RequestsExecutor;
  protected sessionId: string;
  protected forceReadFromMaster: boolean;
  protected documentsById: IRavenObject<IRavenObject>;
  protected includedRawEntitiesByKey: IRavenObject<object>
  protected deletedDocuments: Set<IRavenObject>;
  protected knownMissingIds: Set<string>;
  protected deferCommands: Set<RavenCommandData>;
  protected rawEntitiesAndMetadata: Map<IRavenObject, IStoredRawEntityInfo>;

  private _numberOfRequestsInSession: number;

  public get numberOfRequestsInSession(): number {
    return this._numberOfRequestsInSession;
  }

  public get conventions(): DocumentConventions {
    return this.documentStore.conventions;
  }       

  constructor (database: string, documentStore: IDocumentStore, requestsExecutor: RequestsExecutor,
     sessionId: string, forceReadFromMaster: boolean
  ) {
    this.database = database;
    this.documentStore = documentStore;
    this.requestsExecutor = requestsExecutor;
    this.sessionId = sessionId;
    this.forceReadFromMaster = forceReadFromMaster;
    this.documentsById = {};
    this.includedRawEntitiesByKey = {};
    this.deletedDocuments = new Set<IRavenObject>();
    this.rawEntitiesAndMetadata = new Map<IRavenObject, IStoredRawEntityInfo>();
    this.knownMissingIds = new Set<string>();
    this.deferCommands = new Set<RavenCommandData>();
  }

  public create<T extends Object = IRavenObject>(attributes?: object, documentTypeOrObjectType?: string | DocumentConstructor<T>, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): T {
    const conventions: DocumentConventions = this.documentStore.conventions;
    const objectType: DocumentConstructor<T> | null = conventions.getObjectType(documentTypeOrObjectType);
    let document: T = objectType ? new objectType() : ({} as T);

    Serializer.fromJSON<T>(document, attributes || {}, {}, nestedObjectTypes);
    document['@metadata'] = conventions.buildDefaultMetadata(document, documentTypeOrObjectType);
    return document as T;
  }

  public async load<T extends Object = IRavenObject>(keyOrKeys: string, documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntityCallback<T>): Promise<T>;
  public async load<T extends Object = IRavenObject>(keyOrKeys: string[], documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes?: IRavenObject<DocumentConstructor>, callback?: EntitiesArrayCallback<T>): Promise<T[]>;
  public async load<T extends Object = IRavenObject>(keyOrKeys: string | string[], documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes: IRavenObject<DocumentConstructor> = {}, callback?: EntityCallback<T>
    | EntitiesArrayCallback<T>
  ): Promise<T | T[]> {
    return this.loadDocument<T>(keyOrKeys, documentTypeOrObjectType, includes, nestedObjectTypes)
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback))
      .then((results: T | T[]): T | T[] =>  {
        PromiseResolver.resolve<T | T[]>(results, null, callback);
        return results;
      });
  }

  public async delete<T extends Object = IRavenObject>(keyOrDocument: string, callback?: EntityCallback<T>): Promise<T>;
  public async delete<T extends Object = IRavenObject>(keyOrDocument: T, callback?: EntityCallback<T>): Promise<T>;
  public async delete<T extends Object = IRavenObject>(keyOrDocument: string | T, callback?: EntityCallback<T>): Promise<T> {
    this.incrementRequestsCount();

    return this.prefetchDocument<T>(keyOrDocument)
      .then((document: T) => {
        let etag: number | null = null;
        const conventions = this.conventions;
        const metadata: object = document['@metadata'];
        const key: string = conventions.getIdFromInstance(document);

        if ('Raven-Read-Only' in metadata) {
          return BluebirdPromise.reject(new InvalidOperationException('Document is marked as read only and cannot be deleted'));
        }

        if (conventions.defaultUseOptimisticConcurrency) {
          etag = metadata['@tag'] || null;
        }

        return this.requestsExecutor
          .execute(new DeleteDocumentCommand(key, etag))
          .then(() => {
            PromiseResolver.resolve<T>(document, null, callback);
            return document as T;
          }) as BluebirdPromise<T>;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  public async store<T extends Object = IRavenObject>(document: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean,
     callback?: EntityCallback<T>
  ): Promise<T> {
    this.incrementRequestsCount();

    return this.prepareDocumentToStore<T>(document, key, etag, forceConcurrencyCheck)
      .then((document: T) => {
        let tag: number = null;
        const metadata = document['@metadata'];
        const conventions: DocumentConventions = this.conventions;
        const documentKey: string = conventions.getIdFromInstance(document);

        if (conventions.defaultUseOptimisticConcurrency || metadata['force_concurrency_check']) {
          tag = (metadata['@tag'] as number) || conventions.emptyEtag;
        }

        return this.requestsExecutor
          .execute(new PutDocumentCommand(documentKey, conventions.convertToRawEntity(document), tag))
          .then((): T => {
            PromiseResolver.resolve<T>(document, null, callback);
            return document as T;
          });
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

    return this.requestsExecutor
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

    const query: DocumentQuery<T> = new DocumentQuery<T>(this, this.requestsExecutor, documentTypeOrObjectType, indexName,
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
      //TODO: probably we need to implement batchUpdate / batchDelete as separate API methods in session. But we need discuss this with Rhinos

      throw new InvalidOperationException(StringUtil.format(
        "The maximum number of requests ({0}) allowed for this session has been reached. Raven limits the number \
of remote calls that a session is allowed to make as an early warning system. Sessions are expected to \
be short lived. You can increase the limit by setting DocumentConvention.\
MaxNumberOfRequestsPerSession or MaxNumberOfRequestsPerSession, but it is advisable \
that you'll look into reducing the number of remote calls first, \
since that will speed up your application significantly and result in a\
more responsive application.", maxRequests
      ));
    }
  }

  protected loadDocument<T extends Object = IRavenObject>(keyOrKeys: string | string[], documentTypeOrObjectType?: string | DocumentConstructor<T>, includes?: string[], nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): BluebirdPromise<T | T[]> {
    this.incrementRequestsCount();

    return this.requestsExecutor
      .execute(new GetDocumentCommand(keyOrKeys, includes))
      .then((response: IRavenResponse) => {
        let responseResults: object[];
        const commandResponse: IRavenResponse = response;
        const conventions: DocumentConventions = this.documentStore.conventions;
        const objectType: DocumentConstructor<T> | null = conventions.getObjectType(documentTypeOrObjectType);

        if (_.isEmpty(keyOrKeys)) {
          return BluebirdPromise.reject(new InvalidOperationException('Document key isn\'t set or keys list is empty'));
        }

        if (includes && !TypeUtil.isArray(includes)) {
          includes = _.isString(includes) ? [includes as string] : null;
        }

        if (!(responseResults = commandResponse.Results) || (responseResults.length <= 0)) {
          return BluebirdPromise.reject(new DocumentDoesNotExistsException('Requested document(s) doesn\'t exists'));
        }

        const results: IDocumentConversionResult<T>[] = responseResults.map((result: object) => {
          const conversionResult: IDocumentConversionResult<T> =  this
            .conventions.convertToDocument<T>(result, objectType, nestedObjectTypes);

          this.onDocumentFetched<T>(conversionResult);  
          return conversionResult;  
        });
        
        if (commandResponse.Includes && commandResponse.Includes.length) {
          this.onIncludesFetched(commandResponse.Includes);
        }

        return TypeUtil.isArray(keyOrKeys)
          ? _.first(results).document as T
          : results.map((result: IDocumentConversionResult<T>): T => result.document);
      });
  }

  protected prefetchDocument<T extends Object = IRavenObject>(keyOrEntity: string | T, documentTypeOrObjectType?: string | DocumentConstructor<T>): BluebirdPromise<T> {
    return <BluebirdPromise<T>>(!TypeUtil.isString(keyOrEntity) 
        ? BluebirdPromise.resolve<T>(keyOrEntity as T)
        : this.loadDocument<T>(keyOrEntity as string, documentTypeOrObjectType));
  }

  protected prepareDocumentToStore<T extends Object = IRavenObject>(document: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean): BluebirdPromise<T> {
    if (!document || !TypeUtil.isObject(document)) {
      return BluebirdPromise.reject(
        new InvalidOperationException('Document must be set and be an insstance of object')
      ) as BluebirdPromise<T>;
    }

    return BluebirdPromise.resolve(document)
      .then((entity: T) => {
        entity['@metadata']['force_concurrency_check'] = forceConcurrencyCheck || false;

        if (key && TypeUtil.isNone(etag)) {
          return this.prefetchDocument<T>(key, entity.constructor as DocumentConstructor<T>)
            .then((document: T) => {
              entity['@metadata']['@tag'] = document['@metadata']['@tag'];
              return entity;
            });
        }

        entity['@metadata']['@tag'] = etag;
        return entity;
      })
      .then((entity: T) => {
        let documentKey: string = key;
        const conventions: DocumentConventions = this.conventions;

        if (TypeUtil.isNone(documentKey)) {
          documentKey = conventions.getIdFromInstance(entity);
        } else {
          conventions.setIdOnEntity(entity, documentKey);
          entity['@metadata']['@id'] = documentKey;
        }

        entity['@metadata'] = conventions.buildDefaultMetadata(entity, entity.constructor as DocumentConstructor<T>);

        if (TypeUtil.isNone(documentKey)) {
          return this.documentStore
            .generateId(entity, entity.constructor as DocumentConstructor<T>)
            .then((documentKey: string): T => {
              conventions.setIdOnEntity(entity, documentKey);
              entity['@metadata']['@id'] = documentKey;

              return entity;
            })
        }

        return entity;
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
      changes.addCommand(new PutCommandData(key, _.cloneDeep(rawEntity), etag, info.metadata));
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

      if (RequestMethods.Put === commandResult.Method) {
        const document: IRavenObject = changes.getDocument(index - changes.deferredCommandsCount);

        if (this.rawEntitiesAndMetadata.has(document)) {
          const metadata: object = _.omit(commandResult, 'Method');
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
      const documentKey: string = conversionResult.originalMetadata['@id'];

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