import { IRavenObject } from "../../Types/IRavenObject";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { IDisposable } from "../../Types/Contracts";
import { AbstractCallback } from "../../Types/Callbacks";
import { RequestExecutor } from "../../Http/RequestExecutor";
import { DocumentType, EntityConstructor } from "../DocumentAbstractions";
import { EntitiesCollectionObject } from "../../Types";
import { IAdvancedSessionOperations} from "./IAdvancedSessionOperations";

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

export interface IDocumentSession extends IDisposable {
    numberOfRequestsInSession: number;
    conventions: DocumentConventions;

    /**
     * Get the accessor for advanced operations
     *
     * Those operations are rarely needed, and have been moved to a separate
     * property to avoid cluttering the API
     * @return Advanced session operations
     */
    advanced: IAdvancedSessionOperations;

    load<TEntity extends Object = IRavenObject>(
        id: string, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    load<TEntity extends Object = IRavenObject>(
        id: string, 
        options?: SessionLoadOptions<TEntity>, 
        callback?: AbstractCallback<TEntity>): Promise<TEntity>;
    load<TEntity extends Object = IRavenObject>(
        ids: string[], 
        callback?: AbstractCallback<EntitiesCollectionObject<TEntity>>): Promise<EntitiesCollectionObject<TEntity>>;
    load<TEntity extends Object = IRavenObject>(
        ids: string[], 
        options?: SessionLoadOptions<TEntity>, 
        callback?: AbstractCallback<TEntity>): 
        Promise<EntitiesCollectionObject<TEntity>>;

    delete<TEntity extends Object = IRavenObject>(
        id: string): void;
    delete<TEntity extends Object = IRavenObject>(
        entity: TEntity): void;
    delete<TEntity extends Object = IRavenObject>(
        id: string, expectedChangeVector: string): void;

    store<TEntity extends Object = IRavenObject>(
        document: TEntity, id?: string, callback?: AbstractCallback<TEntity>): Promise<void>;
    store<TEntity extends Object = IRavenObject>(
        document: TEntity,
        id?: string,
        options?: SessionLoadOptions<TEntity>,
        callback?: AbstractCallback<TEntity>): Promise<void>;

    //       query<T extends Object = IRavenObject>(options?: IDocumentQueryOptions<T>): IDocumentQuery<T>;

    saveChanges(): Promise<void>;
}

export interface ISessionOptions {
    database?: string;
    requestExecutor?: RequestExecutor;
}

export interface SessionStoreOptions<T> {
    documentType?: DocumentType<T>;
    changeVector?: string;
}

export interface SessionLoadOptions<T> {
    documentType?: DocumentType<T>;
    includes?: string[];
    // nestedObjectTypes?: IRavenObject<EntityConstructor>;
    expectedChangeVector?: string;
    callback?: AbstractCallback<T | EntitiesCollectionObject<T>>;
}

export interface SessionLoadStartingWithOptions<T> extends StartingWithOptions {
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