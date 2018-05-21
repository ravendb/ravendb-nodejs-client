import { DocumentType } from "../../DocumentAbstractions";
import { EntitiesCollectionObject } from "../../..";
import { AbstractCallback } from "../../../Types/Callbacks";

export interface ILoaderWithInclude {

    //TBD: overrides with expressions + maybe we TInclude, see:

    /**
     * Includes the specified path.
     * @param path Path to include
     * @return Loader with includes
     */
    include(path: string): ILoaderWithInclude;

    /**
     * Loads the specified ids.
     * @param <TResult> Result class
     * @param clazz Result class
     * @param ids Ids to load
     * @return Map: id to entity
     */
    load<TResult extends object>(id: string, documentType: DocumentType<TResult>): Promise<TResult>;
    load<TResult extends object>(
        id: string, 
        documentType?: DocumentType<TResult>,
        callback?: AbstractCallback<TResult>): Promise<TResult>;

    /**
     * Loads the specified ids.
     * @param <TResult> Result class
     * @param clazz Result class
     * @param ids Ids to load
     * @return Map: id to entity
     */
    load<TResult extends object>(
        ids: string[], 
        documentType?: DocumentType<TResult>,
        callback?: AbstractCallback<TResult>): Promise<EntitiesCollectionObject<TResult>>;
}
