import * as _ from "lodash";
import * as BluebirdPromise from "bluebird";
import { IDocumentSession, ISessionOperationOptions, ConcurrencyCheckMode } from "./IDocumentSession";
// import { IDocumentQueryBase, IRawDocumentQuery, IDocumentQuery, IDocumentQueryOptions } from "./IDocumentQuery";
// import { DocumentQueryBase, DocumentQuery } from "./DocumentQuery";
import { IDocumentStore } from "../IDocumentStore";
// import { AdvancedSessionOperations } from "./AdvancedSessionOperations";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { EmptyCallback, AbstractCallback } from "../../Types/Callbacks";
import { PromiseResolver } from "../../Utility/PromiseResolver";
import { TypeUtil } from "../../Utility/TypeUtil";
import { StringUtil } from "../../Utility/StringUtil";
// import {GetDocumentCommand} from "../../Database/Commands/GetDocumentCommand";
import { IRavenObject, EntitiesCollectionObject } from "../../Types";
// import {RavenCommandData} from "../../Database/RavenCommandData";
// import {PutCommandData} from "../../Database/Commands/Data/PutCommandData";
// import {DeleteCommandData} from "../../Database/Commands/Data/DeleteCommandData";
// import {SaveChangesData} from "../../Database/Commands/Data/SaveChangesData";
import { Observable } from "../../Utility/Observable";
import { DeleteCommandData, ICommandData } from "../Commands/CommandData";
import { getError, throwError } from "../../Exceptions";
import { IRavenResponse } from "../../Http/RavenCommand";
import { DocumentType } from "../DocumentAbstractions";
import { LoadOperation } from "./Operations/LoadOperation";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { DocumentStore } from "../DocumentStore";
// import {RequestMethods} from "../../Http/Request/RequestMethod";

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

export interface IDocumentAssociationCheckResult<T extends Object = IRavenObject> {
    doc: T;
    isNew: boolean;
}

export interface IDocumentConversionResult<T extends Object = IRavenObject> {
    rawEntity?: object;
    document: T;
    metadata: object;
    originalMetadata: object;
    documentType: DocumentType<T>;
}

export class DocumentSession extends InMemoryDocumentSessionOperations implements IDocumentSession {

    public constructor(dbName: string, documentStore: DocumentStore, id: string, requestExecutor: RequestExecutor) {
        super(dbName, documentStore, requestExecutor, id);

        //TBD Attachments = new DocumentSessionAttachments(this);
        //TBD Revisions = new DocumentSessionRevisions(this);
    }

    protected _generateId(entity: object): string {
        throw new Error("Method not implemented.");
    }
    public numberOfRequestsInSession: number;

    public conventions: DocumentConventions;

    public async load<TEntity extends Object = IRavenObject>(
        id: string, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    public async load<TEntity extends Object = IRavenObject>(
        id: string, 
        options?: ISessionOperationOptions<TEntity>, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    public async load<TEntity extends Object = IRavenObject>(
        ids: string[], 
        callback?: AbstractCallback<EntitiesCollectionObject<TEntity>>): Promise<EntitiesCollectionObject<TEntity>>;
    public async load<TEntity extends Object = IRavenObject>(
        ids: string[], 
        options?: ISessionOperationOptions<TEntity>, 
        callback?: AbstractCallback<TEntity>): 
        Promise<EntitiesCollectionObject<TEntity>>;
    public async load<TEntity extends Object = IRavenObject>(
        idOrIds: string | string[],
        optionsOrCallback?: 
            ISessionOperationOptions<TEntity> | AbstractCallback<TEntity | EntitiesCollectionObject<TEntity>>,
        callback?: AbstractCallback<TEntity | EntitiesCollectionObject<TEntity>>)
            : Promise<TEntity | EntitiesCollectionObject<TEntity>> {

        const isLoadingSingle = !Array.isArray(idOrIds);
        const ids = !isLoadingSingle ? idOrIds as string[] : [ idOrIds as string ];

        let options: ISessionOperationOptions<TEntity>;
        if (TypeUtil.isFunction(optionsOrCallback)) {
            callback = optionsOrCallback as AbstractCallback<TEntity> || TypeUtil.NOOP;
            options = {};
        } else if (TypeUtil.isObject(optionsOrCallback)) {
            options = optionsOrCallback as ISessionOperationOptions<TEntity>;
            callback = callback || options.callback || TypeUtil.NOOP;
        } else {
            options = {};
            callback = TypeUtil.NOOP;
        }

        const docType: DocumentType<TEntity> = options.documentType;
        const objType = this.conventions.findEntityType(docType);

        const loadOperation = new LoadOperation(this);
        return this._loadInternal(ids, loadOperation)
        .then(() => {
            const result = BluebirdPromise.resolve(loadOperation.getDocuments<TEntity>(objType))
                .then(docs => {
                    if (isLoadingSingle) {
                        return docs[Object.keys(docs)[0]];
                    }

                    return docs;
                })
                .tap((entities: TEntity | EntitiesCollectionObject<TEntity>) => callback(null, entities))
                .tapCatch(err => callback(err));

            return Promise.resolve(result);
        });
    }

    private _loadInternal<T>(ids: string[], operation: LoadOperation): Promise<void> { //TBD optional stream parameter
        operation.byIds(ids);

        const command = operation.createRequest();
        if (command) {
            return this._requestExecutor.execute(command, this._sessionInfo)
                .then(() => {
                    /* TBD
                     if(stream!=null)
                            Context.Write(stream, command.Result.Results.Parent);
                        else
                            operation.SetResult(command.Result);
                     */
                    operation.setResult(command.result); //TBD: delete me after impl stream
                });
        }
    }

    dispose(): void {
        throw new Error("Method not implemented.");
    }
}

// export class DocumentSession2 extends Observable implements IDocumentSession {
//     public static readonly QUERY_INITIALIZED = "query:initialized";

//     protected database: string;
//     protected documentStore: IDocumentStore;
//     protected sessionId: string;
//     protected documentsById: IRavenObject<IRavenObject>;
//     protected includedRawEntitiesById: IRavenObject<object>;
//     protected deletedDocuments: Set<IRavenObject>;
//     protected knownMissingIds: Set<string>;
//     protected deferCommands: Set<ICommandData>;
//     protected rawEntitiesAndMetadata: Map<IRavenObject, IStoredRawEntityInfo>;
//     protected requestExecutor: RequestExecutor;
//     // protected attachedQueries: WeakMap<IDocumentQueryBase, boolean>;

//     private _numberOfRequestsInSession: number = 0;
//     // private _advanced: AdvancedSessionOperations = null;

//     public get numberOfRequestsInSession(): number {
//         return this._numberOfRequestsInSession;
//     }

//     public get conventions(): DocumentConventions {
//         return this.documentStore.conventions;
//     }

//     // public get advanced(): AdvancedSessionOperations {
//     //   if (!this._advanced) {
//     //     const {QUERY_INITIALIZED} = this.constructor as (typeof DocumentSession);

//     //     this._advanced = new AdvancedSessionOperations(this, this.requestExecutor); 
//     //     this._advanced.on<IDocumentQueryBase>(QUERY_INITIALIZED, (query: IDocumentQueryBase) => {
//     //       //this.attachQuery(query);
//     //     });
//     //   }

//     //   return this._advanced;
//     // }

//     constructor(dbName: string, documentStore: IDocumentStore, id: string, requestExecutor: RequestExecutor) {
//         super();

//         const { QUERY_INITIALIZED } = this.constructor as (typeof DocumentSession);

//         this.database = dbName;
//         this.documentStore = documentStore;
//         this.sessionId = id;
//         this.documentsById = {};
//         this.includedRawEntitiesById = {};
//         this.deletedDocuments = new Set<IRavenObject>();
//         this.rawEntitiesAndMetadata = new Map<IRavenObject, IStoredRawEntityInfo>();
//         this.knownMissingIds = new Set<string>();
//         this.deferCommands = new Set<ICommandData>();
//         this.requestExecutor = requestExecutor;
//         // this.attachedQueries = new WeakMap<DocumentQueryBase, boolean>();

//         // this.on<IDocumentQueryBase>(QUERY_INITIALIZED, (query: IDocumentQueryBase) => {
//         //     //this.attachQuery(query);
//         // });
//     }

//     public async load<T extends Object = IRavenObject>(
//         id: string, callback?: EntityCallback<T>): Promise<T>;
//     public async load<T extends Object = IRavenObject>(
//         id: string, options?: ISessionOperationOptions<T>, callback?: EntityCallback<T>): Promise<T>;
//     public async load<T extends Object = IRavenObject>(
//         ids: string[], callback?: EntityCallback<T>): Promise<T[]>;
//     public async load<T extends Object = IRavenObject>(
//         ids: string[], options?: ISessionOperationOptions<T>, callback?: EntitiesCollectionObjectCallback<T>): Promise<T[]>;
//     public async load<T extends Object = IRavenObject>(
//         idOrIds: string | string[],
//         optionsOrCallback?: ISessionOperationOptions<T> | EntityCallback<T> | EntitiesCollectionObjectCallback<T>,
//         callback?: EntityCallback<T> | EntitiesCollectionObjectCallback<T>): Promise<T | T[]> {

//             const isLoadingSingle = Array.isArray(idOrIds);
//             const ids = !isLoadingSingle ? idOrIds as string[] : [ idOrIds ];

//             const loadOperation = new LoadOperation(this);
//             loadInternal(ids, loadOperation);

//             callback = callback 
//                 || (TypeUtil.isFunction(optionsOrCallback) 
//                     ? (optionsOrCallback as EntityCallback<T> | EntitiesCollectionObjectCallback<T>)
//                     : null);

//             const result = BluebirdPromise.resolve(loadOperation.getDocuments())
//                 .then(docs => isLoadingSingle ? docs[0] || null : docs)
//                 .tap(r => callback(null, r))
//                 .tapCatch(err => callback(err));

//             return Promise.resolve(result);

//         // let includes: string[] = null;
//         // let documentType: DocumentType<T> = null;
//         // let options: ISessionOperationOptions<T> = null;
//         // let nestedObjectTypes: IRavenObject<DocumentConstructor> = null;
//         // let loadCallback: EntityCallback<T> | EntitiesArrayCallback<T> = null;

//         // if (_.isEmpty(idOrIds)) {
//         //     return BluebirdPromise.reject(
//         //         getError("InvalidOperationException", "Document ID isn't set or ids list is empty"));
//         // }

//         // if (TypeUtil.isObject(optionsOrCallback)) {
//         //     options = optionsOrCallback as ISessionOperationOptions<T>;

//         //     includes = options.includes;
//         //     documentType = options.documentType;
//         //     nestedObjectTypes = options.nestedObjectTypes;
//         //     loadCallback = options.callback;
//         // } else if (TypeUtil.isFunction(optionsOrCallback)) {
//         //     loadCallback = optionsOrCallback as EntityCallback<T> | EntitiesArrayCallback<T>;
//         // }

//         // if (!loadCallback && TypeUtil.isFunction(callback)) {
//         //     loadCallback = callback;
//         // }

//         // const loadingOneDoc: boolean = !TypeUtil.isArray(idOrIds);
//         // const ids: string[] = loadingOneDoc ? [idOrIds as string] : idOrIds as string[];
//         // let idsOfNonExistingDocuments: Set<string> = new Set<string>(ids);

//         // if (includes && !TypeUtil.isArray(includes)) {
//         //     includes = _.isString(includes) ? [includes as string] : null;
//         // }

//         // if (!includes) {
//         //     const conventions: DocumentConventions = this.documentStore.conventions;

//         //     Array.from<string>(idsOfNonExistingDocuments)
//         //         .filter((id: string): boolean => id
//         //             in this.includedRawEntitiesById
//         //         )
//         //         .forEach((id: string) => {
//         //             this.makeDocument(
//         //                 this.includedRawEntitiesById[id],
//         //                 documentType, nestedObjectTypes
//         //             );

//         //             delete this.includedRawEntitiesById[id];
//         //         });

//         //     idsOfNonExistingDocuments = new Set<string>(
//         //         Array.from<string>(idsOfNonExistingDocuments)
//         //             .filter(id => !(id in this.documentsById)));
//         // }

//         // idsOfNonExistingDocuments = new Set<string>(
//         //     Array.from<string>(idsOfNonExistingDocuments)
//         //         .filter((id: string): boolean => !this.knownMissingIds.has(id)
//         //         ));

//         // return BluebirdPromise.resolve()
//         //     .then((): BluebirdPromise.Thenable<void | T[]> => {
//         //         if (idsOfNonExistingDocuments.size) {
//         //             return this.fetchDocuments<T>(
//         //                 Array.from<string>(idsOfNonExistingDocuments),
//         //                 documentType, includes, nestedObjectTypes
//         //             );
//         //         }
//         //     })
//         //     .then((): T[] => ids.map((id: string): T => (!this.knownMissingIds.has(id)
//         //         && (id in this.documentsById)) ? this.documentsById[id] as T : null
//         //     ))
//         //     .then((results: T[]): T | T[] => {
//         //         let result: T | T[] = results;

//         //         if (loadingOneDoc) {
//         //             result = _.first(results) as T;
//         //         }

//         //         PromiseResolver.resolve<T | T[]>(result, null, loadCallback);
//         //         return result;
//         //     })
//         //     .catch((error) => PromiseResolver.reject<T | T[]>(error, null, loadCallback));
//     }

//     // public async delete<T extends Object = IRavenObject>(
//     //   id: string, callback?: EntityCallback<T | null | void>): Promise<T | null | void>;
//     // public async delete<T extends Object = IRavenObject>(
//     //   id: string, 
//     //   options?: ISessionOperationOptions<T>, 
//     //   callback?: EntityCallback<T | null | void>): Promise<T | null | void>;
//     // public async delete<T extends Object = IRavenObject>(
//     //   document: T, callback?: EntityCallback<T | null | void>): Promise<T | null | void>;
//     // public async delete<T extends Object = IRavenObject>(
//     //   document: T, 
//     //   options?: ISessionOperationOptions<T>, 
//     //   callback?: EntityCallback<T | null | void>): Promise<T | null | void>;
//     // public async delete<T extends Object = IRavenObject>(
//     //   idOrDocument: string | T, 
//     //   optionsOrCallback?: ISessionOperationOptions<T> | EntityCallback<T | null | void>, 
//     //   callback?: EntityCallback<T | null | void>): Promise<T | null | void> {
//     //   let deleteCallback: EntityCallback<T> = null;
//     //   let expectedChangeVector: string = null;

//     //   if (TypeUtil.isFunction(optionsOrCallback)) {
//     //     deleteCallback = optionsOrCallback as EntityCallback<T>;
//     //   } else if (TypeUtil.isObject(optionsOrCallback)) {
//     //     const options: ISessionOperationOptions<T> = optionsOrCallback as ISessionOperationOptions<T>;

//     //     expectedChangeVector = options.expectedChangeVector;
//     //     deleteCallback = options.callback as EntityCallback<T>;
//     //   }

//     //   if (!deleteCallback && TypeUtil.isFunction(callback)) {
//     //     deleteCallback = callback;
//     //   }

//     //   return BluebirdPromise.resolve()
//     //     .then(() => {
//     //       const conventions = this.conventions;
//     //       let info: IStoredRawEntityInfo;
//     //       let id: string;
//     //       let document: T = null;
//     //       let originalMetadata: object;

//     //       if (TypeUtil.isString(idOrDocument)) {
//     //         id = idOrDocument as string;

//     //         if (idOrDocument in this.documentsById) {
//     //           document = this.documentsById[id] as T;
//     //           if (this.isDocumentChanged(document)) {
//     //             return BluebirdPromise.reject(
//     //               getError(
//     //                 "InvalidOperationException", 
//     //                 "Can't delete changed document using identifier. Pass document instance instead"));
//     //           }
//     //         }
//     //       } else {
//     //         document = idOrDocument as T;
//     //         info = this.rawEntitiesAndMetadata.get(document);
//     //         const idProperty = conventions.getIdentityProperty(info.documentType);
//     //         id = document[idProperty];
//     //       }

//     //       if (!document) {
//     //         this.deferCommands.add(new DeleteCommandData(id, expectedChangeVector));
//     //       } else {
//     //         if (!this.rawEntitiesAndMetadata.has(document)) {
//     //           return BluebirdPromise.reject(
//     //             getError(
//     //               "InvalidOperationException", 
//     //               "Document is not associated with the session, cannot delete unknown document instance"));
//     //         }

//     //         ({originalMetadata, id} = info);

//     //         if ("Raven-Read-Only" in originalMetadata) {
//     //           return BluebirdPromise.reject(
//     //               getError(
//     //                 "InvalidOperationException", 
//     //                 "Document is marked as read only and cannot be deleted"));
//     //         }

//     //         if (!TypeUtil.isNull(expectedChangeVector)) {
//     //           info.expectedChangeVector = expectedChangeVector;
//     //           this.rawEntitiesAndMetadata.set(document, info);
//     //         }

//     //         this.deletedDocuments.add(document);
//     //       }

//     //       this.knownMissingIds.add(id);
//     //       delete this.includedRawEntitiesById[id];
//     //       PromiseResolver.resolve<T>(document || null, null, deleteCallback);
//     //     })
//     //     .catch((error: Error) => PromiseResolver.reject<T>(error, null, deleteCallback));
//     // }

//     // public async store<T extends Object = IRavenObject>(
//     //   document: T, id?: string, callback?: EntityCallback<T>): Promise<T>;
//     // public async store<T extends Object = IRavenObject>(
//     //   document: T, id?: string, options?: ISessionOperationOptions<T>, callback?: EntityCallback<T>): Promise<T>;
//     // public async store<T extends Object = IRavenObject>(
//     //   document: T, 
//     //   id?: string, 
//     //   optionsOrCallback?: ISessionOperationOptions<T> | EntityCallback<T>, 
//     //   callback?: EntityCallback<T>): Promise<T> {
//     //   let originalMetadata: object;
//     //   let changeVector: string = null;
//     //   let isNewDocument: boolean = false;
//     //   let documentType: DocumentType<T> = null;
//     //   let storeCallback: EntityCallback<T> = null;
//     //   const conventions: DocumentConventions = this.conventions;

//     //   if (TypeUtil.isObject(optionsOrCallback)) {
//     //     const options: ISessionOperationOptions<T> = optionsOrCallback as ISessionOperationOptions<T>;

//     //     changeVector = options.expectedChangeVector;
//     //     documentType = options.documentType;
//     //     storeCallback = options.callback as EntityCallback<T>;
//     //   } else if (TypeUtil.isFunction(optionsOrCallback)) {
//     //     storeCallback = optionsOrCallback as EntityCallback<T>;
//     //   }

//     //   if (!storeCallback && TypeUtil.isFunction(callback)) {
//     //     storeCallback = callback;
//     //   }

//     //   return this.checkDocumentAndMetadataBeforeStore<T>(document, id, documentType)
//     //     .then((doc: T) => this.checkAssociationAndChangeVectorBeforeStore<T>(doc, id, changeVector))
//     //     .then((result: IDocumentAssociationCheckResult<T>): T | BluebirdPromise.Thenable<T> => {
//     //       const { isNew, doc } = result;

//     //       isNewDocument = isNew;
//     //       if (isNewDocument) {
//     //         originalMetadata = _.cloneDeep(doc["@metadata"] || {});
//     //         return this.prepareDocumentIdBeforeStore<T>(doc, id, changeVector);
//     //       }

//     //       return doc;
//     //     })
//     //     .then((doc: T): T | BluebirdPromise.Thenable<T> => {

//     //       const idProp = conventions.getIdentityProperty(conventions.getJsType(null, doc));
//     //       const docId: string = doc[idProp];
//     //       const commandDataDocumentId = (cmdData) => cmdData.id;
//     //       for (const command of this.deferCommands.values()) {
//     //         if (commandDataDocumentId(command) === docId) {
//     //           return BluebirdPromise.reject(
//     //             getError("InvalidOperationException", StringUtil.format(
//     //             "Can't store document, there is a deferred command registered " +
//     //             "for this document in the session. Document id: {0}", docId
//     //           )));
//     //         }
//     //       }

//     //       if (isNewDocument) {
//     //         const docType: DocumentType<T> = conventions.getTypeFromDocument(doc, docId, documentType);

//     //         if (this.deletedDocuments.has(doc)) {
//     //           return BluebirdPromise.reject(new InvalidOperationException(StringUtil.format(
//     //             "Can't store object, it was already deleted in this " +
//     //             "session. Document id: {0}", docId
//     //           )));
//     //         }

//     //         this.deletedDocuments.delete(doc);
//     //         doc["@metadata"] = conventions.buildDefaultMetadata(doc, docType);
//     //         this.onDocumentFetched<T>(<IDocumentConversionResult<T>>{
//     //           document: doc,
//     //           metadata: doc["@metadata"],
//     //           originalMetadata: originalMetadata,
//     //           rawEntity: conventions.convertToRawEntity(doc, docType)
//     //         });
//     //       }

//     //       PromiseResolver.resolve<T>(doc, null, storeCallback);
//     //       return doc;
//     //     })
//     //     .catch((error: Error) => PromiseResolver.reject<T>(error, null, storeCallback));
//     // }

//     // public async saveChanges(callback?: EmptyCallback): Promise<void> {
//     //   const changes: SaveChangesData = new SaveChangesData(
//     //     Array.from<RavenCommandData>(this.deferCommands),
//     //     this.deferCommands.size
//     //   );

//     //   this.deferCommands.clear();
//     //   this.prepareDeleteCommands(changes);
//     //   this.prepareUpdateCommands(changes);

//     //   if (!changes.commandsCount) {
//     //     return Promise.resolve();
//     //   }

//     //   return this.requestExecutor
//     //     .execute(changes.createBatchCommand())
//     //     .then((results?: IRavenResponse[]) => {
//     //       if (TypeUtil.isNull(results)) {
//     //         return BluebirdPromise.reject(new InvalidOperationException(
//     //           "Cannot call Save Changes after the document store was disposed."
//     //         ));
//     //       }

//     //       this.processBatchCommandResults(results, changes);
//     //       PromiseResolver.resolve<void>(null, null, callback);
//     //     })
//     //     .catch((error: RavenException) => PromiseResolver.reject(error, null, callback));
//     // }

//     // public query<T extends Object = IRavenObject>(options?: IDocumentQueryOptions<T>): IDocumentQuery<T> {
//     //   const query: IDocumentQuery<T> = DocumentQuery.create<T>(this, this.requestExecutor, options);

//     //   this.emit<IDocumentQueryBase<T>>(DocumentSession.QUERY_INITIALIZED, <IDocumentQueryBase<T>>query);
//     //   return query;
//     // }

//     // protected attachQuery<T extends Object = IRavenObject>(query: IDocumentQueryBase<T>): void {
//     //   if (this.attachedQueries.has(query)) {
//     //     throw new InvalidOperationException("Query is already attached to session");
//     //   }

//     //   query.on(
//     //     DocumentQueryBase.EVENT_DOCUMENTS_QUERIED,
//     //     () => this.incrementRequestsCount()
//     //   );

//     //   query.on<IDocumentConversionResult<T>>(
//     //     DocumentQueryBase.EVENT_DOCUMENT_FETCHED,
//     //     (conversionResult?: IDocumentConversionResult<T>) =>
//     //       this.onDocumentFetched<T>(conversionResult)
//     //   );

//     //   query.on<object[]>(
//     //     DocumentQueryBase.EVENT_INCLUDES_FETCHED,
//     //     (includes: object[]) =>
//     //       this.onIncludesFetched(includes)
//     //   );

//     //   this.attachedQueries.set(query, true);
//     // }

// //     protected _incrementRequestsCount(): void {
// //         const maxRequests: number = this.conventions.maxNumberOfRequestsPerSession;

// //         this._numberOfRequestsInSession++;

// //         if (this._numberOfRequestsInSession > maxRequests) {
// //             throwError("InvalidOperationException", StringUtil.format(
// //                 "The maximum number of requests ({0}) allowed for this session has been reached. \
// // Raven limits the number of remote calls that a session is allowed \
// // to make as an early warning system. Sessions are expected to \
// // be short lived, and Raven provides facilities like batch saves (call saveChanges() only once) \
// // You can increase the limit by setting DocumentConvention.\
// // MaxNumberOfRequestsPerSession or MaxNumberOfRequestsPerSession, but it is advisable \
// // that you'll look into reducing the number of remote calls first, \
// // since that will speed up your application significantly and result in a\
// // more responsive application.", maxRequests));
// //         }
// //     }

// //     protected fetchDocuments<T extends Object = IRavenObject>(
// //         ids: string[],
// //         documentType?: DocumentType<T>,
// //         includes?: string[],
// //         nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): Promise<T[]> {
// //         this._incrementRequestsCount();

// //         return this.requestExecutor
// //             .execute(new GetDocumentsCommand(ids, false, includes))
// //             .then((response: IRavenResponse): T[] | PromiseLike<T[]> => {
// //                 let responseResults: object[] = [];
// //                 let responseIncludes: object[] = [];
// //                 const commandResponse: IRavenResponse = response;
// //                 const conventions: DocumentConventions = this.documentStore.conventions;

// //                 if (commandResponse) {
// //                     responseResults = conventions.tryFetchResults(commandResponse);
// //                     responseIncludes = conventions.tryFetchIncludes(commandResponse);
// //                 }

// //                 const results: T[] = responseResults.map((result: object, index: number) => {
// //                     if (TypeUtil.isNull(result)) {
// //                         this.knownMissingIds.add(ids[index]);
// //                         return null;
// //                     }

// //                     return this.makeDocument<T>(result, documentType, nestedObjectTypes);
// //                 });

// //                 if (responseIncludes.length) {
// //                     this.onIncludesFetched(responseIncludes);
// //                 }

// //                 return results;
// //             });
// //     }

//     // public checkDocumentAndMetadataBeforeStore<T extends Object = IRavenObject>(
//     //  document?: object | T, id?: string, documentType?: DocumentType<T>): BluebirdPromise<T> {
//     //   const conventions: DocumentConventions = this.documentStore.conventions;

//     //   if (!document || !TypeUtil.isObject(document)) {
//     //     return BluebirdPromise.reject(
//     //       getError("InvalidOperationException", "Document must be set and be an instance of object")
//     //     ) as BluebirdPromise<T>;
//     //   }

//     //   if (!this.rawEntitiesAndMetadata.has(document)) {
//     //     const docType: DocumentType<T> = conventions.getTypeFromDocument<T>(<T>document, id, documentType);
//     //     const docCtor: DocumentConstructor<T> = conventions.getDocumentConstructor<T>(docType);

//     //     if ("function" !== (typeof docType)) {
//     //       let source: object = _.cloneDeep(<object>document);

//     //       if (docCtor) {
//     //         _.assign(<T>document, new docCtor(), {
//     //           constructor: docCtor,
//     //           __proto__: docCtor.prototype
//     //         });
//     //       }

//     //       Serializer.fromJSON<T>(<T>document, source || {}, _.omit(document["@metadata"] || {},
//     //         conventions.systemMetaKeys), {}, conventions);
//     //     }

//     //     document["@metadata"] = conventions.buildDefaultMetadata(document, docType);
//     //   }

//     //   return BluebirdPromise.resolve<T>(<T>document);
//     // }

//     // protected checkAssociationAndChangeVectorBeforeStore<T extends Object = IRavenObject>(
//     //   document: T, 
//     //   id?: string, 
//     //   changeVector?: string): BluebirdPromise<IDocumentAssociationCheckResult<T>> {
//     //   return BluebirdPromise.resolve()
//     //     .then((): IDocumentAssociationCheckResult<T> => {
//     //       const conventions: DocumentConventions = this.conventions;
//     //       const store: IDocumentStore = this.documentStore;
//     //       let existingId = conventions.getIdFromDocument(document, null);        
//     //       const isNew = !this.rawEntitiesAndMetadata.has(document) && !existingId;

//     //       if (this.rawEntitiesAndMetadata.has(document) || existingId) {
//     //         let info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);
//     //         let metadata: object = document["@metadata"];
//     //         if(existingId && !info){
//     //           info ={
//     //               originalValue: null,
//     //               originalMetadata: null,
//     //               metadata: metadata,
//     //               changeVector: metadata["change-vector"] || null,
//     //               id: existingId,
//     //               concurrencyCheckMode: ConcurrencyCheckModes.Auto,
//     //               documentType: conventions.getTypeFromDocument(document)
//     //           }
//     //       }
//     //         let documentId: string = id || existingId;;
//     //         let checkMode: ConcurrencyCheckMode = ConcurrencyCheckModes.Forced;

//     //         if (TypeUtil.isNull(documentId)) {
//     //           documentId = conventions.getIdFromDocument<T>(document, <DocumentType<T>>info.documentType);
//     //         }

//     //         if (TypeUtil.isNull(changeVector)) {
//     //           checkMode = ConcurrencyCheckModes.Disabled;
//     //         } else {
//     //           info.changeVector = metadata["@change-vector"] = changeVector;

//     //           if (!TypeUtil.isNull(documentId)) {
//     //             checkMode = ConcurrencyCheckModes.Auto;
//     //           }
//     //         }

//     //         info.concurrencyCheckMode = checkMode;
//     //         this.rawEntitiesAndMetadata.set(document, info);
//     //       }

//     //       return {doc, isNew};
//     //     });
//     // }

//     // protected prepareDocumentIdBeforeStore<T extends Object = IRavenObject>(document: T, id?: string, changeVector?: string): BluebirdPromise<T> {
//     //   return BluebirdPromise.resolve(document)
//     //     .then((document: T) => {
//     //       const conventions: DocumentConventions = this.conventions;
//     //       const store: IDocumentStore = this.documentStore;

//     //       let documentId: string = id;

//     //       if (TypeUtil.isNull(documentId)) {
//     //         documentId = conventions.getIdFromDocument<T>(document);
//     //       }

//     //       if (!TypeUtil.isNull(documentId)) {
//     //         conventions.setIdOnDocument(document, documentId);

//     //         document["@metadata"]["@id"] = documentId;
//     //       }

//     //       if (!TypeUtil.isNull(documentId) && !documentId.endsWith("/") && (documentId in this.documentsById)) {
//     //         if (!(new Set<IRavenObject>([this.documentsById[documentId]]).has(document))) {
//     //           return BluebirdPromise.reject(new NonUniqueObjectException(StringUtil.format(
//     //             "Attempted to associate a different object with id '{0}'.", documentId
//     //           )));
//     //         }
//     //       }

//     //       if (TypeUtil.isNull(documentId) || documentId.endsWith("/")) {
//     //         return store
//     //           .generateId(document, conventions.getTypeFromDocument(document))
//     //           .then((documentId: string): T => {
//     //             conventions.setIdOnDocument(document, documentId);

//     //             document["@metadata"]["@id"] = documentId;
//     //             return document;
//     //           });
//     //       }

//     //       return document;
//     //     });
//     // }

//     // protected prepareUpdateCommands(changes: SaveChangesData): void {
//     //   for (let document of this.rawEntitiesAndMetadata.keys()) {
//     //     if (!this.isDocumentChanged(document)) {
//     //       continue;
//     //     }

//     //     let changeVector: string = null;
//     //     const conventions: DocumentConventions = this.conventions;
//     //     const info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);
//     //     const id: string = info.id;
//     //     const rawEntity: object = conventions.convertToRawEntity(document, info.documentType);

//     //     if ((this.conventions.defaultUseOptimisticConcurrency && (ConcurrencyCheckModes.Disabled
//     //         !== info.concurrencyCheckMode)) || (ConcurrencyCheckModes.Forced === info.concurrencyCheckMode)
//     //     ) {
//     //       changeVector = info.changeVector || info.metadata["@change-vector"] || conventions.emptyChangeVector;
//     //     }

//     //     delete this.documentsById[id];
//     //     changes.addDocument(document);
//     //     changes.addCommand(new PutCommandData(id, _.cloneDeep(rawEntity), changeVector));
//     //   }
//     // }

//     // protected prepareDeleteCommands(changes: SaveChangesData): void {
//     //   this.deletedDocuments.forEach((document: IRavenObject) => {
//     //     const id: string = this.rawEntitiesAndMetadata.get(document).id;
//     //     let existingDocument: IRavenObject = null;
//     //     let info: IStoredRawEntityInfo = null;
//     //     let changeVector: string = null;

//     //     if (id in this.documentsById) {
//     //       existingDocument = this.documentsById[id];

//     //       if (this.rawEntitiesAndMetadata.has(existingDocument)) {
//     //         info = this.rawEntitiesAndMetadata.get(existingDocument);

//     //         if (!TypeUtil.isNull(info.expectedChangeVector)) {
//     //           changeVector = info.expectedChangeVector;
//     //         } else if (this.conventions.defaultUseOptimisticConcurrency) {
//     //           changeVector = info.changeVector || info.metadata["@change-vector"];
//     //         }

//     //         this.rawEntitiesAndMetadata.delete(existingDocument);
//     //       }

//     //       delete this.documentsById[id];
//     //     }

//     //     changes.addDocument(existingDocument);
//     //     changes.addCommand(new DeleteCommandData(id, changeVector));
//     //   });

//     //   this.deletedDocuments.clear();
//     // }

//     // protected processBatchCommandResults(results: IRavenResponse[], changes: SaveChangesData): void {
//     //   for (let index: number = changes.deferredCommandsCount; index < results.length; index++) {
//     //     const commandResult: IRavenObject = results[index];

//     //     if (RequestMethods.Put === commandResult.Type) {
//     //       const document: IRavenObject = changes.getDocument(index - changes.deferredCommandsCount);

//     //       if (this.rawEntitiesAndMetadata.has(document)) {
//     //         const metadata: object = _.omit(commandResult, "Type");
//     //         const info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);

//     //         _.assign(info, {
//     //           changeVector: commandResult["@change-vector"],
//     //           metadata: metadata,
//     //           originalValue: _.cloneDeep(this.conventions.convertToRawEntity(document, info.documentType)),
//     //           originalMetadata: _.cloneDeep(metadata)
//     //         });

//     //         this.documentsById[commandResult["@id"]] = document;
//     //         this.rawEntitiesAndMetadata.set(document, info);
//     //       }
//     //     }
//     //   }
//     // }

//     // protected isDocumentChanged<T extends Object = IRavenObject>(document: T): boolean {
//     //   if (this.rawEntitiesAndMetadata.has(document)) {
//     //     const info: IStoredRawEntityInfo = this.rawEntitiesAndMetadata.get(document);

//     //     return !_.isEqual(info.originalValue, this.conventions.convertToRawEntity(document, info.documentType))
//     //       || !_.isEqual(info.originalMetadata, info.metadata);
//     //   }

//     //   return false;
//     // }

//     // protected makeDocument<T extends Object = IRavenObject>(
//     //     commandResult: object,
//     //     documentType?: DocumentType<T>,
//     //     nestedObjectTypes: IRavenObject<DocumentConstructor> = {}): T {
//     //     const conversionResult: IDocumentConversionResult<T> = this.conventions
//     //         .convertToDocument<T>(commandResult, documentType, nestedObjectTypes);

//     //     this.onDocumentFetched<T>(conversionResult);
//     //     return conversionResult.document as T;
//     // }

//     // protected onIncludesFetched(includes: object[]): void {
//     //     if (includes && includes.length) {
//     //         includes.forEach((include: object) => {
//     //             const documentId: string = include["@metadata"]["@id"];

//     //             if (!(documentId in this.documentsById)) {
//     //                 this.includedRawEntitiesById[documentId] = include;
//     //             }
//     //         });
//     //     }
//     // }

//     // protected onDocumentFetched<T extends Object = IRavenObject>(
//     //     conversionResult?: IDocumentConversionResult<T>): void {
//     //     if (conversionResult) {
//     //         const documentId: string = this.conventions
//     //             .getIdFromDocument(conversionResult.document, conversionResult.documentType)
//     //             || conversionResult.originalMetadata["@id"] || conversionResult.metadata["@id"];

//     //         if (documentId) {
//     //             this.knownMissingIds.delete(documentId);

//     //             if (!(documentId in this.documentsById)) {
//     //                 let originalValueSource: object = conversionResult.rawEntity;

//     //                 if (!originalValueSource) {
//     //                     originalValueSource = this.conventions
//     //                         .convertToRawEntity<T>(conversionResult.document, conversionResult.documentType);
//     //                 }

//     //                 this.documentsById[documentId] = conversionResult.document;
//     //                 this.rawEntitiesAndMetadata.set(this.documentsById[documentId], {
//     //                     originalValue: _.cloneDeep(originalValueSource),
//     //                     originalMetadata: conversionResult.originalMetadata,
//     //                     metadata: conversionResult.metadata,
//     //                     changeVector: conversionResult.metadata["change-vector"] || null,
//     //                     id: documentId,
//     //                     concurrencyCheckMode: "Auto",
//     //                     documentType: conversionResult.documentType
//     //                 });
//     //             }
//     //         }
//     //     }
//     // }

//     // tslint:disable-next-line:no-empty
//     public dispose(): void {}
// }