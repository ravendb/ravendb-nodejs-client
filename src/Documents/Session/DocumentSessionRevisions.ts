import {AdvancedSessionExtensionBase} from "./AdvancedSessionExtensionBase";
import {
    IRevisionsSessionOperations,
    SessionRevisionsMetadataOptions,
    SessionRevisionsOptions
} from "./IRevisionsSessionOperations";
import {InMemoryDocumentSessionOperations} from "./InMemoryDocumentSessionOperations";
import {MetadataAsDictionary} from "../../Mapping/MetadataAsDictionary";
import {GetRevisionOperation} from "./Operations/GetRevisionOperation";
import {TypeUtil} from "../../Utility/TypeUtil";
import {DocumentType} from "../DocumentAbstractions";
import {AbstractCallback} from "../../Types/Callbacks";
import * as PromiseUtil from "../../Utility/PromiseUtil";
import {RevisionsCollectionObject} from "../../Types";

export class DocumentSessionRevisions extends AdvancedSessionExtensionBase implements IRevisionsSessionOperations {

    public constructor(session: InMemoryDocumentSessionOperations) {
        super(session);
    }

    public async getFor<TEntity extends object>(id: string): Promise<TEntity[]>;
    public async getFor<TEntity extends object>(id: string, callback: AbstractCallback<TEntity[]>): Promise<TEntity[]>;
    public async getFor<TEntity extends object>(
        id: string, options: SessionRevisionsOptions<TEntity>): Promise<TEntity[]>;
    public async getFor<TEntity extends object>(
        id: string, options: SessionRevisionsOptions<TEntity>,
        callback: AbstractCallback<TEntity[]>): Promise<TEntity[]>;
    public async getFor<TEntity extends object>(
        id: string, optionsOrCallback?: SessionRevisionsOptions<TEntity> | AbstractCallback<TEntity[]>,
        optionalCallback?: AbstractCallback<TEntity[]>): Promise<TEntity[]> {

        const callback: AbstractCallback<TEntity[]>
            = TypeUtil.isFunction(optionsOrCallback) ? optionsOrCallback : optionalCallback;

        const sourceOptions = TypeUtil.isFunction(optionsOrCallback)
            ? undefined
            : optionsOrCallback as SessionRevisionsOptions<TEntity>;

        const result = this._getFor(id, sourceOptions);
        PromiseUtil.passResultToCallback(result, callback);
        return result;
    }

    private async _getFor<TEntity extends object>(
        id: string, options?: SessionRevisionsOptions<TEntity>)
        : Promise<TEntity[]> {

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
    public async getMetadataFor(id: string,
                                callback: AbstractCallback<MetadataAsDictionary[]>): Promise<MetadataAsDictionary[]>;
    public async getMetadataFor(id: string, options: SessionRevisionsMetadataOptions):
        Promise<MetadataAsDictionary[]>;
    public async getMetadataFor(id: string, options: SessionRevisionsMetadataOptions,
                                callback: AbstractCallback<MetadataAsDictionary[]>):
        Promise<MetadataAsDictionary[]>;
    public async getMetadataFor(id: string,
                                optionsOrCallback?: SessionRevisionsMetadataOptions
                                    | AbstractCallback<MetadataAsDictionary[]>,
                                optionalCallback?: AbstractCallback<MetadataAsDictionary[]>):
        Promise<MetadataAsDictionary[]> {

        const callback: AbstractCallback<MetadataAsDictionary[]>
            = TypeUtil.isFunction(optionsOrCallback) ? optionsOrCallback : optionalCallback;

        const sourceOptions = TypeUtil.isFunction(optionsOrCallback)
            ? undefined
            : optionsOrCallback as SessionRevisionsOptions<MetadataAsDictionary>;

        const result = this._getMetadataFor(id, sourceOptions);
        PromiseUtil.passResultToCallback(result, callback);
        return result;
    }

    private async _getMetadataFor(id: string, options: SessionRevisionsMetadataOptions):
        Promise<MetadataAsDictionary[]> {
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

    public async get<TEntity extends object>(changeVector: string): Promise<TEntity>;
    public async get<TEntity extends object>(changeVector: string,
                                             callback: AbstractCallback<TEntity>): Promise<TEntity>;
    public async get<TEntity extends object>(changeVector: string,
                                             documentType: DocumentType<TEntity>): Promise<TEntity>;
    public async get<TEntity extends object>(changeVector: string,
                                             documentType: DocumentType<TEntity>,
                                             callback: AbstractCallback<TEntity>): Promise<TEntity>;
    public async get<TEntity extends object>(changeVectors: string[])
        : Promise<RevisionsCollectionObject<TEntity>>;
    public async get<TEntity extends object>(changeVectors: string[], callback: AbstractCallback<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity>>;
    public async get<TEntity extends object>(changeVectors: string[], documentType: DocumentType<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity>>;
    public async get<TEntity extends object>(changeVectors: string[],
                                             documentType: DocumentType<TEntity>,
                                             callback: AbstractCallback<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity>>;
    public async get<TEntity extends object>(changeVectorOrVectors: string | string[],
                                             documentTypeOrCallback?: DocumentType<TEntity> | AbstractCallback<TEntity>,
                                             optionalCallback?: AbstractCallback<TEntity>)
        : Promise<RevisionsCollectionObject<TEntity> | TEntity> {

        const documentType = TypeUtil.isDocumentType(documentTypeOrCallback)
            ? documentTypeOrCallback as DocumentType<TEntity>
            : undefined;
        const callback = TypeUtil.isDocumentType(documentTypeOrCallback)
            ? optionalCallback
            : documentTypeOrCallback as AbstractCallback<TEntity>;

        const result = this._get(changeVectorOrVectors, documentType);
        PromiseUtil.passResultToCallback(result, callback);
        return result;
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
