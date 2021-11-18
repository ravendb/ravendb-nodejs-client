import { ILazyRevisionsOperations, LazySessionRevisionsOptions } from "../../ILazyRevisionsOperations";
import { DocumentSession } from "../../DocumentSession";
import { Lazy } from "../../../Lazy";
import { GetRevisionOperation } from "../GetRevisionOperation";
import { MetadataAsDictionary, MetadataDictionary } from "../../../../Mapping/MetadataAsDictionary";
import { SessionRevisionsMetadataOptions } from "../../IRevisionsSessionOperations";
import { DocumentType } from "../../../DocumentAbstractions";
import { RevisionsCollectionObject } from "../../../../Types";
import { LazyRevisionOperation } from "./LazyRevisionOperation";
import { TypeUtil } from "../../../../Utility/TypeUtil";

export class LazyRevisionOperations implements ILazyRevisionsOperations {

    protected readonly delegate: DocumentSession;

    constructor(delegate: DocumentSession) {
        this.delegate = delegate;
    }

    getMetadataFor(id: string): Lazy<MetadataAsDictionary[]>;
    getMetadataFor(id: string, options: SessionRevisionsMetadataOptions): Lazy<MetadataAsDictionary[]>;
    getMetadataFor(id: string, options?: SessionRevisionsMetadataOptions): Lazy<MetadataAsDictionary[]> {
        options = Object.assign({
            pageSize: 25,
            start: 0
        } as SessionRevisionsMetadataOptions, options || {});

        const operation = new GetRevisionOperation(this.delegate, id, options.start, options.pageSize);
        const lazyRevisionOperation = new LazyRevisionOperation(MetadataDictionary, operation, "ListOfMetadata");
        return this.delegate.addLazyOperation(lazyRevisionOperation);
    }

    public get<TEntity extends object>(id: string, date: Date): Lazy<TEntity>;
    public get<TEntity extends object>(changeVector: string): Lazy<TEntity>;
    public get<TEntity extends object>(changeVector: string,
                                             documentType: DocumentType<TEntity>): Lazy<TEntity>;
    public get<TEntity extends object>(changeVectors: string[])
        : Lazy<RevisionsCollectionObject<TEntity>>;
    public get<TEntity extends object>(changeVectors: string[], documentType: DocumentType<TEntity>)
        : Lazy<RevisionsCollectionObject<TEntity>>;
    public get<TEntity extends object>(
        changeVectorOrVectorsOrId: string | string[],
        documentTypeOrDate?: DocumentType<TEntity> | Date)
        : Lazy<RevisionsCollectionObject<TEntity> | TEntity> {
        const documentType = TypeUtil.isDocumentType(documentTypeOrDate)
            ? documentTypeOrDate as DocumentType<TEntity>
            : undefined;

        if (TypeUtil.isDate(documentTypeOrDate)) {
            return this._getByIdAndDate(
                changeVectorOrVectorsOrId as string, documentTypeOrDate);
        } else {
            return this._get(changeVectorOrVectorsOrId, documentType);
        }
    }

    private _get<TEntity extends object>(changeVectorOrVectors: string | string[],
                                               documentType?: DocumentType<TEntity>)
        : Lazy<RevisionsCollectionObject<TEntity> | TEntity> {
        const operation = new GetRevisionOperation(this.delegate, changeVectorOrVectors as string);
        const lazyRevisionOperation = new LazyRevisionOperation(documentType, operation, "Map");
        return this.delegate.addLazyOperation(lazyRevisionOperation);
    }

    private _getByIdAndDate<TEntity extends object>(id: string, date: Date, clazz?: DocumentType<TEntity>): Lazy<TEntity> {
        const operation = new GetRevisionOperation(this.delegate, id, date);
        const lazyRevisionOperation = new LazyRevisionOperation<TEntity>(clazz, operation, "Single");
        return this.delegate.addLazyOperation(lazyRevisionOperation);
    }

    public getFor<TEntity extends object>(id: string): Lazy<TEntity[]>;
    public getFor<TEntity extends object>(
        id: string, options: LazySessionRevisionsOptions<TEntity>): Lazy<TEntity[]>;
    public getFor<TEntity extends object>(
        id: string, options: LazySessionRevisionsOptions<TEntity> = {}): Lazy<TEntity[]> {

        const start = options.start ?? 0;
        const pageSize = options.pageSize ?? 25;
        const operation = new GetRevisionOperation(this.delegate, id, start, pageSize);
        const lazyRevisionOperation = new LazyRevisionOperation(options.documentType, operation, "Multi");
        return this.delegate.addLazyOperation(lazyRevisionOperation);
    }
}