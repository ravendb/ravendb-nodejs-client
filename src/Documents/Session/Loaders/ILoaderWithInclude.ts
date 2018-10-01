import { DocumentType } from "../../DocumentAbstractions";
import { EntitiesCollectionObject } from "../../..";
import { AbstractCallback } from "../../../Types/Callbacks";

export interface ILoaderWithInclude {

    //TBD: overrides with expressions + maybe we TInclude, see:

    /**
     * Includes the specified path.
     */
    include(path: string): ILoaderWithInclude;

    /**
     * Loads the specified id.
     */
    load<TResult extends object>(id: string, documentType: DocumentType<TResult>): Promise<TResult>;

    /**
     * Loads the specified id.
     */
    load<TResult extends object>(
        id: string, 
        documentType?: DocumentType<TResult>,
        callback?: AbstractCallback<TResult>): Promise<TResult>;

    /**
     * Loads the specified ids.
     */
    load<TResult extends object>(
        ids: string[], 
        documentType?: DocumentType<TResult>,
        callback?: AbstractCallback<TResult>): Promise<EntitiesCollectionObject<TResult>>;
}
