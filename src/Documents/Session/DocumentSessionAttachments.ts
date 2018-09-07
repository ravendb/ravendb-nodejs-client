
import { DocumentSessionAttachmentsBase } from "./DocumentSessionAttachmentsBase";
import { IAttachmentsSessionOperations } from "./IAttachmentsSessionOperations";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { HeadAttachmentCommand } from "../Commands/HeadAttachmentCommand";
import { AttachmentResult } from "../Attachments";
import { GetAttachmentOperation } from "../Operations/Attachments/GetAttachmentOperation";

export class DocumentSessionAttachments
    extends DocumentSessionAttachmentsBase implements IAttachmentsSessionOperations {

    public constructor(session: InMemoryDocumentSessionOperations) {
        super(session);
    }

    public async exists(documentId: string, name: string): Promise<boolean> {
        const command = new HeadAttachmentCommand(documentId, name, null);
        await this._requestExecutor.execute(command, this._sessionInfo);
        return !!command.result;
    }

    public async get(entity: object, name: string): Promise<AttachmentResult>;
    public async get(documentId: string, name: string): Promise<AttachmentResult>;
    public async get(idOrEntity: string | object, name: string): Promise<AttachmentResult> {
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
        return await this._session.operations.send(operation, this._sessionInfo);
    }
    //TBD public AttachmentResult GetRevision(string documentId, string name, string changeVector)
}
