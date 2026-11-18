import { ILazySessionOperations } from "./ILazySessionOperations.js";
import { DocumentSession } from "../../DocumentSession.js";
import { ILazyLoaderWithInclude } from "../../Loaders/ILazyLoaderWithInclude.js";
import { LazyMultiLoaderWithInclude } from "../../Loaders/LazyMultiLoaderWithInclude.js";
import { ObjectTypeDescriptor, EntitiesCollectionObject } from "../../../../Types/index.js";
import { Lazy } from "../../../Lazy.js";
import { SessionLoadStartingWithOptions } from "../../IDocumentSession.js";
import { LazyStartsWithOperation } from "./LazyStartsWithOperation.js";
import { LoadStartingWithOperation } from "../LoadStartingWithOperation.js";
import { ConditionalLoadResult } from "../../ConditionalLoadResult.js";
import { StringUtil } from "../../../../Utility/StringUtil.js";
import { throwError } from "../../../../Exceptions/index.js";
import { LazyConditionalLoadOperation } from "./LazyConditionalLoadOperation.js";

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
        clazz: ObjectTypeDescriptor<TEntity>,
        onEval?: (results: EntitiesCollectionObject<TEntity>) => void): Lazy<EntitiesCollectionObject<TEntity>>;
    public load<TEntity extends object>(
        id: string,
        clazz: ObjectTypeDescriptor<TEntity>,
        onEval?: (result: TEntity | null) => void): Lazy<TEntity | null>;
    public load<TEntity extends object>(ids: string[]): Lazy<EntitiesCollectionObject<TEntity>>;
    public load<TEntity extends object>(id: string): Lazy<TEntity | null>;
    public load<TEntity extends object>(
        idOrIds: string | string[],
        clazz?: ObjectTypeDescriptor<TEntity>,
        onEval?: (result: any) => void): Lazy<TEntity | null> | Lazy<EntitiesCollectionObject<TEntity>> {
        const isMultipleIds = Array.isArray(idOrIds);
        if (!isMultipleIds && this._delegate.isLoaded(idOrIds as string)) {
            return new Lazy(() =>
                this._delegate.load<TEntity>(idOrIds as string, { documentType: clazz }));

        }

        const ids: string[] = isMultipleIds ? idOrIds as string[] : [idOrIds as string];
        const onEvalResults = onEval && !isMultipleIds
            ? (results: EntitiesCollectionObject<TEntity>) => onEval(results[idOrIds as string])
            : onEval;
        const result = this._delegate.lazyLoadInternal(ids, [], clazz, onEvalResults);
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
        // eslint-disable-next-line unicorn/prefer-default-parameters
        opts = opts || null;
        opts = Object.assign({}, LoadStartingWithOperation.DEFAULT, opts);
        const operation = new LazyStartsWithOperation<TEntity>(idPrefix, opts, this._delegate);
        return this._delegate.addLazyOperation(operation);
    }

    public conditionalLoad<TEntity extends object>(id: string, changeVector: string, clazz: ObjectTypeDescriptor<TEntity>): Lazy<ConditionalLoadResult<TEntity>> {
        if (StringUtil.isNullOrEmpty(id)) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        if (this._delegate.isLoaded(id)) {
            return new Lazy<ConditionalLoadResult<TEntity>>(async () => {
                const entity = await this._delegate.load(id, clazz);
                if (!entity) {
                    return {
                        entity: null,
                        changeVector: null
                    }
                }

                const cv = this._delegate.advanced.getChangeVectorFor(entity);
                return {
                    entity,
                    changeVector: cv
                }
            });
        }

        if (StringUtil.isNullOrEmpty(changeVector)) {
            throwError("InvalidArgumentException", "The requested document with id '"
                + id + "' is not loaded into the session and could not conditional load when changeVector is null or empty.");
        }

        const lazyLoadOperation = new LazyConditionalLoadOperation<TEntity>(this._delegate, id, changeVector, clazz);
        return this._delegate.addLazyOperation(lazyLoadOperation);
    }

    // TBD expr ILazyLoaderWithInclude<T> ILazySessionOperations.Include<T>(
    //     Expression<Func<T, string>> path)
    // TBD expr ILazyLoaderWithInclude<T> ILazySessionOperations.Include<T>(
    //     Expression<Func<T, IEnumerable<string>>> path)
    // TBD Lazy<List<TResult>> ILazySessionOperations.MoreLikeThis<TResult>(
    //     MoreLikeThisQuery query)
}
