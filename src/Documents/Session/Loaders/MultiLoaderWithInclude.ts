import * as BluebirdPromise from "bluebird";
import { ILoaderWithInclude } from "./ILoaderWithInclude";
import { IDocumentSessionImpl } from "../IDocumentSession";
import { DocumentType } from "../../DocumentAbstractions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { EntitiesCollectionObject } from "../../..";
import { AbstractCallback } from "../../../Types/Callbacks";

/**
 * Fluent implementation for specifying include paths
 * for loading documents
 */
export class MultiLoaderWithInclude implements ILoaderWithInclude {

    private _session: IDocumentSessionImpl;
    private _includes: string[] = [];

    /**
     * Includes the specified path.
     * @param path Path to include
     * @return loader with includes
     */
    public include(path: string): ILoaderWithInclude  {
        this._includes.push(path);
        return this;
    }

    /**
     * Loads the specified ids.
     * @param <TResult> Result class
     * @param clazz Result class
     * @param ids Ids to load
     * @return Map: id to entity
     */
    public async load<TResult extends object>(id: string, documentType?: DocumentType<TResult>): Promise<TResult>;
    public async load<TResult extends object>(
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
    public async load<TResult extends object>(
        ids: string[], 
        documentType?: DocumentType<TResult>): Promise<EntitiesCollectionObject<TResult>>;
    public async load<TResult extends object>(
        ids: string | string[], 
        documentType?: DocumentType<TResult>,
        callback?: AbstractCallback<TResult | EntitiesCollectionObject<TResult>>)
            : Promise<TResult | EntitiesCollectionObject<TResult>> {
        callback = callback || TypeUtil.NOOP;
        
        let singleResult = false;
        if (TypeUtil.isString(ids)) {
            ids = [ ids ] as string[];
            singleResult = true;
        }

        const entityType = this._session.conventions.findEntityType(documentType);

        const result = BluebirdPromise.resolve()
            .then(() => this._session.loadInternal(ids as string[], this._includes, entityType))
            .then(results => {
                return singleResult ?
                    Object.keys(results).map(x => results[x])[0] as TResult :
                    results;
            })
            .tap((results) => callback(null, results))
            .tapCatch(err => callback(err));
        
        return Promise.resolve(result);
    }

    /**
     * Initializes a new instance of the MultiLoaderWithInclude class
     * @param session Session
     */
    public constructor(session: IDocumentSessionImpl) {
        this._session = session;
    }

}
