import { DocumentType } from "../../DocumentAbstractions";
import { ErrorFirstCallback } from "../../../Types/Callbacks";
import { EntitiesCollectionObject } from "../../../Types";

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
        callback?: ErrorFirstCallback<TResult>): Promise<TResult>;

    /**
     * Loads the specified ids.
     */
    load<TResult extends object>(
        ids: string[],
        documentType?: DocumentType<TResult>,
        callback?: ErrorFirstCallback<TResult>): Promise<EntitiesCollectionObject<TResult>>;
}
