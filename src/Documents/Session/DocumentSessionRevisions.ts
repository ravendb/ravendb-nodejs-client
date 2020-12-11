import {
    IRevisionsSessionOperations,
    SessionRevisionsMetadataOptions,
    SessionRevisionsOptions
} from "./IRevisionsSessionOperations";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { MetadataAsDictionary } from "../../Mapping/MetadataAsDictionary";
import { GetRevisionOperation } from "./Operations/GetRevisionOperation";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DocumentType } from "../DocumentAbstractions";
import { RevisionsCollectionObject } from "../../Types";
import { DocumentSessionRevisionsBase } from "./DocumentSessionRevisionsBase";

export class DocumentSessionRevisions extends DocumentSessionRevisionsBase implements IRevisionsSessionOperations {

    public constructor(session: InMemoryDocumentSessionOperations) {
        super(session);
    }

    public async getFor<TEntity extends object>(id: string): Promise<TEntity[]>;
    public async getFor<TEntity extends object>(
        id: string, options: SessionRevisionsOptions<TEntity>): Promise<TEntity[]>;
    public async getFor<TEntity extends object>(
        id: string, options?: SessionRevisionsOptions<TEntity>): Promise<TEntity[]> {
        options = Object.assign({
            pageSize: 25,
            start: 0
        } as SessionRevisionsOptions<TEntity>, options || {});

        const operation = new GetRevisionOperation(this._session, id, options.start, options.pageSize);

        const command = operation.createRequest();
        await this._requestExecutor.execute(command, this._sessionInfo);
        operation.result = command.result;
        return operation.getRevisionsFor(options.documentType);
    }

    public async getMetadataFor(id: string): Promise<MetadataAsDictionary[]>;
    public async getMetadataFor(id: string, options: SessionRevisionsMetadataOptions): Promise<MetadataAsDictionary[]>;
    public async getMetadataFor(id: string, options?: SessionRevisionsMetadataOptions): Promise<MetadataAsDictionary[]> {
        options = Object.assign({
            pageSize: 25,
            start: 0
        } as SessionRevisionsMetadataOptions, options || {});
        const operation = new GetRevisionOperation(this._session, id, options.start, options.pageSize, true);
        const command = operation.createRequest();
        await this._requestExecutor.execute(command, this._sessionInfo);
        operation.result = command.result;
        return operation.getRevisionsMetadataFor();
    }

    public async get<TEntity extends object>(id: string, date: Date): Promise<TEntity>;
    public async get<TEntity extends object>(changeVector: string): Promise<TEntity>;
    public async get<TEntity extends object>(changeVector: string,
                                             documentType: DocumentType<TEntity>): Promise<TEntity>;
    public async get<TEntity extends object>(changeVectors: string[])
        : Promise<RevisionsCollectionObject<TEntity>>;
    public async get<TEntity extends object>(changeVectors: string[], documentType: DocumentType<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity>>;
    public async get<TEntity extends object>(
        changeVectorOrVectorsOrId: string | string[],
        documentTypeOrDate?: DocumentType<TEntity> | Date)
        : Promise<RevisionsCollectionObject<TEntity> | TEntity> {

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

    private async _getByIdAndDate<TEntity extends object>(
        id: string, date: Date, clazz?: DocumentType<TEntity>) {
        const operation = new GetRevisionOperation(this._session, id, date);
        const command = operation.createRequest();
        await this._requestExecutor.execute(command, this._sessionInfo);
        operation.result = command.result;
        return operation.getRevision(clazz);
    }

    private async _get<TEntity extends object>(changeVectorOrVectors: string | string[],
                                               documentType?: DocumentType<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity> | TEntity> {
        const operation = new GetRevisionOperation(this._session, changeVectorOrVectors as any);

        const command = operation.createRequest();
        await this._requestExecutor.execute(command, this._sessionInfo);
        operation.result = command.result;
        return TypeUtil.isArray(changeVectorOrVectors)
            ? operation.getRevisions(documentType)
            : operation.getRevision(documentType);
    }


}
