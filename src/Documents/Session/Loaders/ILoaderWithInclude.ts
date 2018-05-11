import { DocumentType, EntityConstructor } from "../../DocumentAbstractions";
import { EntitiesCollectionObject } from "../../..";

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
    load<TResult>(id: string, documentType: DocumentType<TResult>): Promise<TResult>;

    /**
     * Loads the specified ids.
     * @param <TResult> Result class
     * @param clazz Result class
     * @param ids Ids to load
     * @return Map: id to entity
     */
    load<TResult>(ids: string[], documentType: DocumentType<TResult>): Promise<EntitiesCollectionObject<TResult>>;
}
