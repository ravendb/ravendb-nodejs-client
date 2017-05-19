import * as _ from 'lodash';
import * as BluebirdPromise from 'bluebird'
import {IDocumentSession} from "./IDocumentSession";
import {IDocumentQuery, IDocumentQueryOptions} from "./IDocumentQuery";
import {DocumentQuery} from "./DocumentQuery";
import {IDocumentStore} from '../IDocumentStore';
import {RequestsExecutor} from '../../Http/Request/RequestsExecutor';
import {DocumentConventions, DocumentConstructor} from '../Conventions/DocumentConventions';
import {EntityCallback, EntitiesArrayCallback} from '../../Utility/Callbacks';
import {PromiseResolver} from '../../Utility/PromiseResolver';
import {TypeUtil} from "../../Utility/TypeUtil";
import {InvalidOperationException, DocumentDoesNotExistsException, RavenException} from "../../Database/DatabaseExceptions";
import {StringUtil} from "../../Utility/StringUtil";
import {GetDocumentCommand} from "../../Database/Commands/GetDocumentCommand";
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {DeleteDocumentCommand} from "../../Database/Commands/DeleteDocumentCommand";
import {PutDocumentCommand} from "../../Database/Commands/PutDocumentCommand";
import {QueryOperator} from "./QueryOperator";
import {IRavenObject} from "../../Database/IRavenObject";
import {Serializer} from "../../Json/Serializer";

export class DocumentSession implements IDocumentSession {
  protected database: string;
  protected documentStore: IDocumentStore;
  protected requestsExecutor: RequestsExecutor;
  protected sessionId: string;
  protected forceReadFromMaster: boolean;
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
  }

  public create<T extends Object = IRavenObject>(attributes?: object, documentTypeOrObjectType?: string | DocumentConstructor<T>, nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): T {
    const conventions: DocumentConventions = this.documentStore.conventions;
    const objectType: DocumentConstructor<T> | null = conventions.tryGetObjectType(documentTypeOrObjectType);
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
    this.incrementRequestsCount();

    return this.requestsExecutor
      .execute(new GetDocumentCommand(keyOrKeys, includes))
      .then((response: IRavenResponse) => {
        let responseResults: object[];
        const commandResponse: IRavenResponse = response;
        const conventions: DocumentConventions = this.documentStore.conventions;
        const objectType: DocumentConstructor<T> | null = conventions.tryGetObjectType(documentTypeOrObjectType);

        if (_.isEmpty(keyOrKeys)) {
          return BluebirdPromise.reject(new InvalidOperationException('Document key isn\'t set or keys list is empty'));
        }

        if (includes && !TypeUtil.isArray(includes)) {
          includes = _.isString(includes) ? [includes as string] : null;
        }

        if (!(responseResults = commandResponse.Results) || (responseResults.length <= 0)) {
          return BluebirdPromise.reject(new DocumentDoesNotExistsException('Requested document(s) doesn\'t exists'));
        }

        const results = responseResults.map((result: object) => this
          .conventions.tryConvertToDocument<T>(result, objectType, nestedObjectTypes)
          .document as T);

        const result: T | T[] = TypeUtil.isArray(keyOrKeys)
          ? _.first(results) as T
          : results as T[];

        PromiseResolver.resolve<T | T[]>(result as T | T[], null, callback);
        return result;
      })
      .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
  }

  public async delete<T extends Object = IRavenObject>(keyOrEntity: string | T, callback?: EntityCallback<T>): Promise<T> {
    this.incrementRequestsCount();

    return this.prefetchDocument<T>(keyOrEntity)
    .then((document: T) => {
      let etag: number | null = null;
      const conventions = this.conventions;
      const metadata: object = document['@metadata'];
      const key: string = conventions.tryGetIdFromInstance(document);

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

  public async store<T extends Object = IRavenObject>(entity: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean,
     callback?: EntityCallback<T>
  ): Promise<T> {
    this.incrementRequestsCount();

    return this.prepareDocumentToStore<T>(entity, key, etag, forceConcurrencyCheck)
      .then((entity: T) => {
        let tag: number = null;
        const metadata = entity['@metadata'];
        const conventions: DocumentConventions = this.conventions;
        const documentKey: string = conventions.tryGetIdFromInstance(entity);

        if (conventions.defaultUseOptimisticConcurrency || metadata['force_concurrency_check']) {
          tag = (metadata['@tag'] as number) || conventions.emptyEtag;
        }

        return this.requestsExecutor
          .execute(new PutDocumentCommand(documentKey, conventions.tryConvertToRawEntity(entity), tag))
          .then((): T => {
            PromiseResolver.resolve<T>(entity, null, callback);
            return entity as T;
          });
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

    return new DocumentQuery<T>(this, this.requestsExecutor, documentTypeOrObjectType, indexName,
      usingDefaultOperator, waitForNonStaleResults, includes, nestedObjectTypes, withStatistics
    );
  }

  public incrementRequestsCount(): void {
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

  protected prefetchDocument<T extends Object = IRavenObject>(keyOrEntity: string | T, documentTypeOrObjectType?: string | DocumentConstructor<T>): BluebirdPromise<T> {
    return new BluebirdPromise<T>(
      (resolve: (value?: T) => void, reject: (error?: any) => void) => 
      !TypeUtil.isString(keyOrEntity) 
        ? BluebirdPromise.resolve<T>(keyOrEntity as T) as BluebirdPromise<T>
        : this.load(keyOrEntity as string, documentTypeOrObjectType)
            .then((value?: T) => resolve(value))
            .catch((error?: any) => reject(error))
    );
  }

  protected prepareDocumentToStore<T extends Object = IRavenObject>(entity: T, key?: string, etag?: number, forceConcurrencyCheck?: boolean): BluebirdPromise<T> {
    if (!entity || !TypeUtil.isObject(entity)) {
      return BluebirdPromise.reject(
        new InvalidOperationException('Document must be set and be an insstance of object')
      ) as BluebirdPromise<T>;
    }

    return BluebirdPromise.resolve(entity)
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
          documentKey = conventions.tryGetIdFromInstance(entity);
        } else {
          conventions.trySetIdOnEntity(entity, documentKey);
          entity['@metadata']['@id'] = documentKey;
        }

        entity['@metadata'] = conventions.buildDefaultMetadata(entity, entity.constructor as DocumentConstructor<T>);

        if (TypeUtil.isNone(documentKey)) {
          return this.documentStore
            .generateId(entity, entity.constructor as DocumentConstructor<T>)
            .then((documentKey: string): T => {
              conventions.trySetIdOnEntity(entity, documentKey);
              entity['@metadata']['@id'] = documentKey;

              return entity;
            })
        }

        return entity;
      });
  }
}