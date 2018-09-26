
import { DocumentSessionAttachmentsBase } from "./DocumentSessionAttachmentsBase";
import { IAttachmentsSessionOperations } from "./IAttachmentsSessionOperations";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { HeadAttachmentCommand } from "../Commands/HeadAttachmentCommand";
import { AttachmentResult } from "../Attachments";
import { GetAttachmentOperation } from "../Operations/Attachments/GetAttachmentOperation";
import { AbstractCallback } from "../../Types/Callbacks";
import * as PromiseUtil from "../../Utility/PromiseUtil";

export class DocumentSessionAttachments
    extends DocumentSessionAttachmentsBase implements IAttachmentsSessionOperations {

    public constructor(session: InMemoryDocumentSessionOperations) {
        super(session);
    }

    public async exists(documentId: string, name: string): Promise<boolean>;
    public async exists(documentId: string, name: string, callback: AbstractCallback<boolean>): Promise<boolean>;
    public async exists(documentId: string, name: string, callback?: AbstractCallback<boolean>): Promise<boolean> {
        const result = this._exists(documentId, name);
        PromiseUtil.passResultToCallback(result, callback);
        return result;
    }

    private async _exists(documentId: string, name: string): Promise<boolean> {
        const command = new HeadAttachmentCommand(documentId, name, null);
        await this._requestExecutor.execute(command, this._sessionInfo);
        return !!command.result;
    }

    public async get(entity: object, name: string): Promise<AttachmentResult>;
    public async get(documentId: string, name: string): Promise<AttachmentResult>;
    public async get(
        entity: object, name: string, callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;
    public async get(
        documentId: string, name: string, callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;
    public async get(
        idOrEntity: string | object, 
        name: string, 
        callback?: AbstractCallback<AttachmentResult>): Promise<AttachmentResult> {
        const result = this._get(idOrEntity as any, name);
        PromiseUtil.passResultToCallback(result, callback);
        return result;
    }

    private async _get(idOrEntity: string | object, name: string): Promise<AttachmentResult> {
        let docId;
        if (typeof idOrEntity !== "string") {
            const document = this._documentsByEntity.get(idOrEntity);
            if (!document) {
                this._throwEntityNotInSession(idOrEntity);
            }

            docId = document.id;
        } else {
            docId = idOrEntity;
        }

        const operation: GetAttachmentOperation =
            new GetAttachmentOperation(docId, name, "Document", null);
        return this._session.operations.send(operation, this._sessionInfo);
    }

    public async getRevision(documentId: string, name: string, changeVector: string): Promise<AttachmentResult>;
    public async getRevision(documentId: string, name: string, changeVector: string,
                             callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;
    public async getRevision(documentId: string, name: string, changeVector: string,
                             callback?: AbstractCallback<AttachmentResult>): Promise<AttachmentResult> {
        const operation = new GetAttachmentOperation(documentId, name, "Revision", changeVector);
        const result = this._session.operations.send(operation, this._sessionInfo);
        PromiseUtil.passResultToCallback(result, callback);
        return result;
    }
}
