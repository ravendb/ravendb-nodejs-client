import { ILazySessionOperations } from "./ILazySessionOperations";
import { DocumentSession } from "../../DocumentSession";
import { ILazyLoaderWithInclude } from "../../Loaders/ILazyLoaderWithInclude";
import { LazyMultiLoaderWithInclude } from "../../Loaders/LazyMultiLoaderWithInclude";
import { ObjectTypeDescriptor, EntitiesCollectionObject } from "../../../../Types";
import { Lazy } from "../../../Lazy";
import { SessionLoadStartingWithOptions } from "../../IDocumentSession";
import { LazyStartsWithOperation } from "./LazyStartsWithOperation";
import { LoadStartingWithOperation } from "../LoadStartingWithOperation";

export class LazySessionOperations implements ILazySessionOperations {
    
    protected _delegate: DocumentSession;
    public constructor(delegate: DocumentSession) {
        this._delegate = delegate;
    }

    public include(path: string): ILazyLoaderWithInclude {
        return new LazyMultiLoaderWithInclude(this._delegate).include(path);
    }

    public load<TEntity extends object>(
        ids: string[],
        clazz: ObjectTypeDescriptor<TEntity>): Lazy<EntitiesCollectionObject<TEntity>>;
    public load<TEntity extends object>(
        id: string,
        clazz: ObjectTypeDescriptor<TEntity>): Lazy<TEntity>;
    public load<TEntity extends object>(ids: string[]): Lazy<EntitiesCollectionObject<TEntity>>;
    public load<TEntity extends object>(id: string): Lazy<TEntity>;
    public load<TEntity extends object>(
        idOrIds: string | string[],
        clazz?: ObjectTypeDescriptor<TEntity>): Lazy<TEntity> | Lazy<EntitiesCollectionObject<TEntity>> {
        const isMultipleIds = Array.isArray(idOrIds);
        if (!isMultipleIds && this._delegate.isLoaded(idOrIds as string)) {
            return new Lazy(() => 
                this._delegate.load<TEntity>(idOrIds as string, { documentType: clazz }));

        }

        const ids: string[] = isMultipleIds ? idOrIds as string[] : [ idOrIds as string ];
        const result = this._delegate.lazyLoadInternal(ids, [], clazz);
        return isMultipleIds 
            ? result 
            : new Lazy(async () => (await result.getValue())[idOrIds as string]);
    }

    public loadStartingWith<TEntity extends object>(
        idPrefix: string,
        opts: SessionLoadStartingWithOptions<TEntity>): Lazy<EntitiesCollectionObject<TEntity>>;
    public loadStartingWith<TEntity extends object>(idPrefix: string): Lazy<EntitiesCollectionObject<TEntity>>;
    public loadStartingWith<TEntity extends object>(
        idPrefix: string, 
        opts?: SessionLoadStartingWithOptions<TEntity>): 
        Lazy<EntitiesCollectionObject<TEntity>> {
            opts = opts || null;
            opts = Object.assign({}, LoadStartingWithOperation.DEFAULT, opts);
            const operation = new LazyStartsWithOperation(idPrefix, opts, this._delegate);
            return this._delegate.addLazyOperation(operation);
    }

    // TBD expr ILazyLoaderWithInclude<T> ILazySessionOperations.Include<T>(Expression<Func<T, string>> path)
    // TBD expr ILazyLoaderWithInclude<T> ILazySessionOperations.Include<T>(Expression<Func<T, IEnumerable<string>>> path)
    // TBD Lazy<List<TResult>> ILazySessionOperations.MoreLikeThis<TResult>(MoreLikeThisQuery query)
}
