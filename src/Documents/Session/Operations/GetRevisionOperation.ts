import {InMemoryDocumentSessionOperations} from "../InMemoryDocumentSessionOperations";
import {GetRevisionsCommand} from "../../Commands/GetRevisionsCommand";
import {throwError} from "../../../Exceptions";
import {TypeUtil} from "../../../Utility/TypeUtil";
import {IRavenArrayResult, IRavenObject} from "../../../Types";
import {DocumentInfo} from "../DocumentInfo";
import {MetadataAsDictionary} from "../../../Mapping/MetadataAsDictionary";
import {CONSTANTS} from "../../../Constants";
import {DocumentType} from "../../DocumentAbstractions";

export class GetRevisionOperation {

    private readonly _session: InMemoryDocumentSessionOperations;

    private _result: IRavenArrayResult;
    private readonly _command: GetRevisionsCommand;

    public constructor(session: InMemoryDocumentSessionOperations, id: string, before: Date);
    public constructor(session: InMemoryDocumentSessionOperations, id: string, start: number, pageSize: number);
    public constructor(session: InMemoryDocumentSessionOperations, id: string, start: number, pageSize: number,
                       metadataOnly: boolean);
    public constructor(session: InMemoryDocumentSessionOperations, changeVector: string);
    public constructor(session: InMemoryDocumentSessionOperations, changeVectors: string[]);
    public constructor(session: InMemoryDocumentSessionOperations, changeVectorOrChangeVectorsOrId: string | string[],
                       startOrDate?: Date | number, pageSize?: number, metadataOnly: boolean = false) {
        if (!session) {
            throwError("InvalidArgumentException", "Session cannot be null");
        }

        if (!changeVectorOrChangeVectorsOrId) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        this._session = session;
        if (startOrDate instanceof Date) {
            this._command = new GetRevisionsCommand(changeVectorOrChangeVectorsOrId as string, startOrDate);
        } else if (TypeUtil.isArray(changeVectorOrChangeVectorsOrId)) {
            this._command = new GetRevisionsCommand(changeVectorOrChangeVectorsOrId);
        } else if (TypeUtil.isNumber(startOrDate)) {
            this._command = new GetRevisionsCommand(changeVectorOrChangeVectorsOrId, startOrDate,
                pageSize, metadataOnly);
        } else {
            this._command = new GetRevisionsCommand(changeVectorOrChangeVectorsOrId);
        }
    }

    public createRequest() {
        return this._command;
    }

    set result(result: IRavenArrayResult) {
        this._result = result;
    }

    private _getRevision<TEntity extends object>(documentType: DocumentType<TEntity>, document: IRavenObject): TEntity {
        if (!document) {
            return null;
        }

        let id: string = null;

        const metadata = document[CONSTANTS.Documents.Metadata.KEY];
        if (metadata) {
            id = metadata[CONSTANTS.Documents.Metadata.ID];
        }

        let changeVector = null as string;
        if (metadata) {
            changeVector = metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
        }

        const entity = this._session.entityToJson.convertToEntity(documentType, id, document) as any as TEntity;
        const documentInfo = new DocumentInfo();
        documentInfo.id = id;
        documentInfo.changeVector = changeVector;
        documentInfo.document = document;
        documentInfo.metadata = metadata;
        documentInfo.entity = entity;
        this._session.documentsByEntity.set(entity, documentInfo);
        return entity;
    }

    public getRevisionsFor<TEntity extends object>(documentType: DocumentType<TEntity>): TEntity[] {
        const resultsCount = this._result.results.length;
        const results = [] as TEntity[];

        for (const document of this._result.results) {
            results.push(this._getRevision<TEntity>(documentType, document));
        }
        return results;
    }

    public getRevisionsMetadataFor(): MetadataAsDictionary[] {
        const resultsCount = this._result.results.length;
        const results = [] as MetadataAsDictionary[];

        for (const document of this._result.results) {
            const metadata = document[CONSTANTS.Documents.Metadata.KEY];
            results.push(metadata);
        }

        return results;
    }

    public getRevision<TEntity extends object>(documentType: DocumentType<TEntity>): TEntity {
        if (!this._result) {
            return null;
        }

        const document = this._result.results[0];
        return this._getRevision(documentType, document);
    }

    public getRevisions<TEntity extends object>(documentType: DocumentType<TEntity>): Map<string, TEntity> {
        const results = new Map<string, TEntity>();

        for (let i = 0; i < this._command.changeVectors.length; i++) {
            const changeVector = this._command.changeVectors[i];
            if (!changeVector) {
                continue;
            }

            results.set(changeVector, this._getRevision(documentType, this._result.results[i]));
        }

        return results;
    }
}
