import { ILazyLoaderWithInclude } from "./ILazyLoaderWithInclude";
import { IDocumentSessionImpl } from "../IDocumentSession";
import { ObjectTypeDescriptor, EntitiesCollectionObject } from "../../../Types";
import { Lazy } from "../../Lazy";

export class LazyMultiLoaderWithInclude implements ILazyLoaderWithInclude {
    private readonly _session: IDocumentSessionImpl;
    private readonly _includes: string[] = [];

    public constructor(session: IDocumentSessionImpl) {
        this._session = session;
    }

    /**
     * Includes the specified path.
     */
    public include(path: string): ILazyLoaderWithInclude {
        this._includes.push(path);
        return this;
    }

    public load<TResult extends object>(ids: string[]): Lazy<EntitiesCollectionObject<TResult>>;
    public load<TResult extends object>(
        ids: string[], clazz: ObjectTypeDescriptor<TResult>): Lazy<EntitiesCollectionObject<TResult>>;
    public load<TResult extends object>(id: string): Lazy<TResult | null>;
    public load<TResult extends object>(id: string, clazz?: ObjectTypeDescriptor<TResult>): Lazy<TResult | null>;
    public load<TResult extends object>(ids: string | string[], clazz?: ObjectTypeDescriptor<TResult>):
        Lazy<TResult | null | EntitiesCollectionObject<TResult>> {
        const isMultiple = Array.isArray(ids);
        const result = this._session.lazyLoadInternal(
            isMultiple ? ids as string[] : [ids] as string[],
            this._includes,
            clazz);

        if (isMultiple) {
            return result;
        }

        return new Lazy(async () => {
            const x = await result.getValue();
            return x[Object.keys(x)[0]];
        });
    }
}
