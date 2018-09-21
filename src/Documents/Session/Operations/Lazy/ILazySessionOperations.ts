import { ILazyLoaderWithInclude } from "../../../Session/Loaders/ILazyLoaderWithInclude";
import { ObjectTypeDescriptor, EntitiesCollectionObject } from "../../../../Types";
import { Lazy } from "../../../Lazy";
import { AbstractCallback } from "../../../../Types/Callbacks";
import { SessionLoadStartingWithOptions } from "../../IDocumentSession";

/**
 * Specify interface for lazy operation for the session
 */
export interface ILazySessionOperations {

    /**
     * Begin a load while including the specified path
     * @param path Path in documents in which server should look for a 'referenced' documents.
     */
    include(path: string): ILazyLoaderWithInclude;

    //TBD expr ILazyLoaderWithInclude<TResult> Include<TResult>(Expression<Func<TResult, string>> path);

    //TBD expr ILazyLoaderWithInclude<TResult> Include<TResult>(Expression<Func<TResult, IEnumerable<string>>> path);

    /**
     * Loads the specified entities with the specified ids.
     * @param clazz Result class
     * @param ids Ids of documents that should be lazy loaded
     * @param <TResult> Result class
     */
    load<TEntity extends object>(
        ids: string[], 
        clazz: ObjectTypeDescriptor<TEntity>): Lazy<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads the specified entities with the specified ids.
     * @param clazz Result class
     * @param ids Ids of documents that should be lazy loaded
     * @param <TResult> Result class
     */
    load<TEntity extends object>(ids: string[]): Lazy<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads the specified entity with the specified id.
     * @param clazz Result class
     * @param id Identifier of a entity that will be loaded.
     * @param <TResult> Result class
     */
    load<TEntity extends object>(id: string): Lazy<TEntity>;

    /**
     * Loads the specified entity with the specified id.
     * @param clazz Result class
     * @param id Identifier of a entity that will be loaded.
     * @param onEval Action to be executed on evaluation.
     * @param <TResult> Result class
     */
    load<TEntity extends object>(
        id: string, 
        clazz: ObjectTypeDescriptor<TEntity>): Lazy<TEntity>;

    /**
     * Loads multiple entities that contain common prefix.
     * @param clazz Result class
     * @param idPrefix prefix for which documents should be returned e.g. "products/"
     * @param <TResult> Result class
     */
    loadStartingWith<TEntity extends object>(idPrefix: string): Lazy<EntitiesCollectionObject<TEntity>>;
    loadStartingWith<TEntity extends object>(
        idPrefix: string, clazz: ObjectTypeDescriptor<TEntity>): Lazy<EntitiesCollectionObject<TEntity>>;

    /**
     * Loads multiple entities that contain common prefix.
     * @param clazz Result class
     * @param opts starting with options
     * @param matches pipe ('|') separated values for which document IDs (after 'idPrefix') should be matched ('?' any single character, '*' any characters)
     * @param <TResult> Result class
     */
    loadStartingWith<TEntity extends object>(
        idPrefix: string,
        opts: SessionLoadStartingWithOptions<TEntity>): Lazy<EntitiesCollectionObject<TEntity>>;
}
