import { ILazyLoaderWithInclude } from "../../../Session/Loaders/ILazyLoaderWithInclude";
import { ObjectTypeDescriptor, EntitiesCollectionObject } from "../../../../Types";
import { Lazy } from "../../../Lazy";
import { SessionLoadStartingWithOptions } from "../../IDocumentSession";
import { ConditionalLoadResult } from "../../ConditionalLoadResult";

/**
 * Specify interface for lazy operation for the session
 */
export interface ILazySessionOperations {

    /**
     * Begin a load while including the specified path
     */
    include(path: string): ILazyLoaderWithInclude;

    //TBD expr ILazyLoaderWithInclude<TResult> Include<TResult>(Expression<Func<TResult, string>> path);

    //TBD expr ILazyLoaderWithInclude<TResult> Include<TResult>(Expression<Func<TResult, IEnumerable<string>>> path);

    /**
     * Loads the specified entities with the specified ids.
     */
    load<TEntity extends object>(
        ids: string[],
        clazz: ObjectTypeDescriptor<TEntity>): Lazy<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads the specified entities with the specified ids.
     */
    load<TEntity extends object>(ids: string[]): Lazy<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads the specified entity with the specified id.
     */
    load<TEntity extends object>(id: string): Lazy<TEntity>;

    /**
     * Loads the specified entity with the specified id.
     */
    load<TEntity extends object>(
        id: string,
        clazz: ObjectTypeDescriptor<TEntity>): Lazy<TEntity>;

    /**
     * Loads multiple entities that contain common prefix.
     */
    loadStartingWith<TEntity extends object>(idPrefix: string): Lazy<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities that contain common prefix.
     */
    loadStartingWith<TEntity extends object>(
        idPrefix: string, clazz: ObjectTypeDescriptor<TEntity>): Lazy<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities that contain common prefix.
     */
    loadStartingWith<TEntity extends object>(
        idPrefix: string,
        opts: SessionLoadStartingWithOptions<TEntity>): Lazy<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads the specified entity with the specified id and changeVector.
     * If the entity is loaded into the session, the tracked entity will be returned otherwise
     * the entity will be loaded only if it is fresher then the provided changeVector.
     * @param id Identifier of a entity that will be conditional loaded.
     * @param changeVector Change vector of a entity that will be conditional loaded.
     * @param clazz Result class
     */
    conditionalLoad<TEntity extends object>(
        id: string, changeVector: string, clazz: ObjectTypeDescriptor<TEntity>
    ): Lazy<ConditionalLoadResult<TEntity>>;
}
