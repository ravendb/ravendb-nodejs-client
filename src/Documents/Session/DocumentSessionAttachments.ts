import { DocumentSessionAttachmentsBase } from "./DocumentSessionAttachmentsBase.js";
import { IAttachmentsSessionOperations } from "./IAttachmentsSessionOperations.js";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations.js";
import { HeadAttachmentCommand } from "../Commands/HeadAttachmentCommand.js";
import { AttachmentEnumeratorResult, AttachmentResult } from "../Attachments/index.js";
import { GetAttachmentOperation } from "../Operations/Attachments/GetAttachmentOperation.js";
import { GetAttachmentsOperation } from "../Operations/Attachments/GetAttachmentsOperation.js";
import { AttachmentRequest } from "../Operations/Attachments/AttachmentRequest.js";

export class DocumentSessionAttachments
    extends DocumentSessionAttachmentsBase implements IAttachmentsSessionOperations {

    public constructor(session: InMemoryDocumentSessionOperations) {
        super(session);
    }

    public async exists(documentId: string, name: string): Promise<boolean> {
        const command = new HeadAttachmentCommand(documentId, name, null);
        this._session.incrementRequestCount();
        await this._requestExecutor.execute(command, this._sessionInfo);
        return !!command.result;
    }

    public async get(entity: object, name: string): Promise<AttachmentResult>;
    public async get(documentId: string, name: string): Promise<AttachmentResult>;
    public async get(attachments: AttachmentRequest[]): Promise<AsyncGenerator<AttachmentEnumeratorResult>>;
    public async get(
        idOrEntity: string | object | AttachmentRequest[],
        name?: string): Promise<AttachmentResult | AsyncGenerator<AttachmentEnumeratorResult>> {
        if (Array.isArray(idOrEntity)) {
            const operation = new GetAttachmentsOperation(idOrEntity, "Document");
            this._session.incrementRequestCount();
            return this._session.operations.send(operation, this._sessionInfo);
        }

        const operation: GetAttachmentOperation =
            new GetAttachmentOperation(this._getDocumentId(idOrEntity), name, "Document", null);
        this._session.incrementRequestCount();
        return await this._session.operations.send(operation, this._sessionInfo);
    }

    public async getRange(entity: object, name: string, from: number | null, to: number | null): Promise<AttachmentResult>;
    public async getRange(documentId: string, name: string, from: number | null, to: number | null): Promise<AttachmentResult>;
    public async getRange(
        idOrEntity: string | object,
        name: string,
        from: number | null,
        to: number | null): Promise<AttachmentResult> {
        const operation = new GetAttachmentOperation(this._getDocumentId(idOrEntity), name, "Document", null, from, to);
        this._session.incrementRequestCount();
        return await this._session.operations.send(operation, this._sessionInfo);
    }

    private _getDocumentId(idOrEntity: string | object): string {
        if (typeof idOrEntity === "string") {
            return idOrEntity;
        }

        const document = this._session.documentsByEntity.get(idOrEntity);
        if (!document) {
            this._throwEntityNotInSessionOrMissingId(idOrEntity);
        }

        return document.id;
    }

    public async getRevision(documentId: string, name: string, changeVector: string): Promise<AttachmentResult> {
        const operation = new GetAttachmentOperation(documentId, name, "Revision", changeVector);
        this._session.incrementRequestCount();
        return this._session.operations.send(operation, this._sessionInfo);
    }
}
