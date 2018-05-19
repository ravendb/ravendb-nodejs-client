import { IRavenObject } from "../../Types/IRavenObject";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IDisposable } from "../../Types/Contracts";
import { AbstractCallback } from "../../Types/Callbacks";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentType } from "../DocumentAbstractions";
import { EntitiesCollectionObject, ObjectTypeDescriptor } from "../../Types";
import { IAdvancedSessionOperations} from "./IAdvancedSessionOperations";
import { ILoaderWithInclude } from "./Loaders/ILoaderWithInclude";
import { DocumentQueryOptions } from "./QueryOptions";
import { IDocumentQuery } from "./IDocumentQuery";

export class SessionInfo {
    public sessionId: number;

    public constructor(sessionId?: number) {
        this.sessionId = sessionId;
    }
}

export interface IMetadataDictionary {
    [key: string]: Object;
}

export type ConcurrencyCheckMode = "Auto" | "Forced" | "Disabled";

export interface IDocumentSessionImpl {
    conventions: DocumentConventions;
}
export interface IDocumentSession extends IDisposable {
    /**
     * Get the accessor for advanced operations
     *
     * Those operations are rarely needed, and have been moved to a separate
     * property to avoid cluttering the API
     * @return Advanced session operations
     */
    advanced: IAdvancedSessionOperations;

    load<TEntity extends object = IRavenObject>(
        id: string, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    load<TEntity extends object = IRavenObject>(
        id: string, 
        documentType?: DocumentType<TEntity>, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    load<TEntity extends object = IRavenObject>(
        id: string, 
        options?: LoadOptions<TEntity>, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    load<TEntity extends object = IRavenObject>(
        ids: string[], 
        callback?: AbstractCallback<EntitiesCollectionObject<TEntity>>): Promise<EntitiesCollectionObject<TEntity>>;
    load<TEntity extends object = IRavenObject>(
        ids: string[], 
        documentType?: DocumentType<TEntity>, 
        callback?: AbstractCallback<TEntity>): 
        Promise<EntitiesCollectionObject<TEntity>>;
    load<TEntity extends object = IRavenObject>(
        ids: string[], 
        options?: LoadOptions<TEntity>, 
        callback?: AbstractCallback<TEntity>): 
        Promise<EntitiesCollectionObject<TEntity>>;

    delete<TEntity extends object = IRavenObject>(
        id: string): void;
    delete<TEntity extends object = IRavenObject>(
        entity: TEntity): void;
    delete<TEntity extends object = IRavenObject>(
        id: string, expectedChangeVector: string): void;

    store<TEntity extends object = IRavenObject>(
        document: TEntity, id?: string, callback?: AbstractCallback<void>): Promise<void>;
    store<TEntity extends object = IRavenObject>(
        document: TEntity,
        id?: string,
        documentType?: DocumentType<TEntity>,
        callback?: AbstractCallback<void>): Promise<void>;
    store<TEntity extends object = IRavenObject>(
        document: TEntity,
        id?: string,
        options?: StoreOptions<TEntity>,
        callback?: AbstractCallback<void>): Promise<void>;

    
    /**
     * Begin a load while including the specified path
     * Path in documents in which server should look for a 'referenced' documents.
     * @param path Path to include
     * @return Loader with includes
     */
    include(path: string): ILoaderWithInclude;

    //       query<T extends Object = IRavenObject>(options?: IDocumentQueryOptions<T>): IDocumentQuery<T>;

    saveChanges(): Promise<void>;

    query<T extends object>(opts: DocumentQueryOptions<T>): IDocumentQuery<T>;
    query<T extends object>(documentType: DocumentType<T>): IDocumentQuery<T>;
}

export interface ISessionOptions {
    database?: string;
    requestExecutor?: RequestExecutor;
}

export interface StoreOptions<T extends object> {
    documentType?: DocumentType<T>;
    changeVector?: string;
}

export interface LoadOptions<T extends object> {
    documentType?: DocumentType<T>;
    includes?: string[];
    expectedChangeVector?: string;
}

export interface SessionLoadStartingWithOptions<T extends object> extends StartingWithOptions {
    documentType?: DocumentType<T>;
    matches?: string;
    start?: number;
    pageSize?: number;
    exclude?: string;
    startAfter?: string;
}

export interface StartingWithOptions {
    matches?: string;
    start?: number;
    pageSize?: number;
    exclude?: string;
    startAfter?: string;
}

export interface IDocumentSessionImpl extends IDocumentSession {

    conventions: DocumentConventions;

    loadInternal<TResult extends object>(
        ids: string[], includes: string[], clazz: ObjectTypeDescriptor<TResult>): 
        Promise<EntitiesCollectionObject<TResult>>;

    // tslint:disable-next-line:max-line-length
    // TBD: Lazy<Dictionary<string, T>> LazyLoadInternal<T>(string[] ids, string[] includes, Action<Dictionary<string, T>> onEval);
}
