import {AdvancedSessionExtensionBase} from "./AdvancedSessionExtensionBase";
import {AttachmentName} from "./../Attachments";
import {AttachmentData} from "./../Attachments";
import {CONSTANTS} from "./../../Constants";
import {InMemoryDocumentSessionOperations} from "./InMemoryDocumentSessionOperations";
import {StringUtil} from "../../Utility/StringUtil";
import {throwError} from "../../Exceptions";
import {IdTypeAndName} from "../IdTypeAndName";
import {DocumentInfo} from "./DocumentInfo";
import {PutAttachmentCommandData} from "../Commands/Batches/PutAttachmentCommandData";
import {DeleteAttachmentCommandData} from "./../Commands/Batches/DeleteAttachmentCommandData";

export abstract class DocumentSessionAttachmentsBase extends AdvancedSessionExtensionBase {
    protected constructor(session: InMemoryDocumentSessionOperations) {
        super(session);
    }

    public getNames(entity: object): AttachmentName[] {
        if (!entity) {
            return [];
        }

        const document = this._documentsByEntity.get(entity);
        if (!document) {
            this._throwEntityNotInSession(entity);
        }

        const results = document.metadata[CONSTANTS.Documents.Metadata.ATTACHMENTS] as AttachmentName[];
        return results || [];
    }

    public store(documentId: string, name: string, stream: AttachmentData): void;
    public store(documentId: string, name: string, stream: AttachmentData, contentType: string): void;
    public store(entity: object, name: string, stream: AttachmentData): void;
    public store(entity: object, name: string, stream: AttachmentData, contentType: string): void;
    public store(
        documentIdOrEntity: string | object,
        name: string,
        stream: AttachmentData,
        contentType: string = null): void {

        if (typeof documentIdOrEntity === "object") {
            return this._storeAttachmentByEntity(documentIdOrEntity, name, stream, contentType);
        }

        if (StringUtil.isWhitespace(documentIdOrEntity)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null");
        }

        if (StringUtil.isWhitespace(name)) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(documentIdOrEntity, "DELETE", null))) {
            throwError("InvalidOperationException",
                "Cannot store attachment" + name
                + " of document " + documentIdOrEntity
                + ", there is a deferred command registered for this document to be deleted");
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(documentIdOrEntity, "AttachmentPUT", name))) {
            throwError("InvalidOperationException",
                "Cannot store attachment" + name + " of document "
                + documentIdOrEntity
                + ", there is a deferred command registered to create an attachment with the same name.");
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(documentIdOrEntity, "AttachmentDELETE", name))) {
            throwError("InvalidOperationException",
                "Cannot store attachment" + name + " of document "
                + documentIdOrEntity
                + ", there is a deferred command registered to delete an attachment with the same name.");
        }

        const documentInfo: DocumentInfo = this._documentsById.getValue(documentIdOrEntity);
        if (documentInfo && this._deletedEntities.has(documentInfo.entity)) {
            throwError("InvalidOperationException",
                "Cannot store attachment " + name + " of document "
                + documentIdOrEntity + ", the document was already deleted in this session.");
        }

        this.defer(new PutAttachmentCommandData(documentIdOrEntity, name, stream, contentType, null));
    }

    private _storeAttachmentByEntity(
        entity: object, name: string, stream: AttachmentData, contentType: string): void {
        const document: DocumentInfo = this._documentsByEntity.get(entity);
        if (!document) {
            this._throwEntityNotInSession(entity);
        }

        return this.store(document.id, name, stream, contentType);
    }

    protected _throwEntityNotInSession(entity: object): never {
        return throwError("InvalidArgumentException",
            entity
            + " is not associated with the session. Use documentId instead or track the entity in the session.");
    }

    private _deleteAttachmentByEntity(entity: object, name: string): void {
        const document: DocumentInfo = this._documentsByEntity.get(entity);
        if (!document) {
            this._throwEntityNotInSession(entity);
        }

        return this.delete(document.id, name);
    }

    public delete(entity: object, name: string): void;
    public delete(documentId: string, name: string): void;
    public delete(entityOrId: string | object, name: string): void {
        if (typeof entityOrId !== "string") {
            return this._deleteAttachmentByEntity(entityOrId, name);
        }

        if (StringUtil.isWhitespace(entityOrId)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null");
        }

        if (StringUtil.isWhitespace(name)) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(entityOrId, "DELETE", null)) ||
            this._deferredCommandsMap.has(IdTypeAndName.keyFor(entityOrId, "AttachmentDELETE", name))) {
            return; // no-op
        }

        const documentInfo = this._documentsById.getValue(entityOrId);
        if (documentInfo && this._deletedEntities.has(documentInfo.entity)) {
            return;  //no-op
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(entityOrId, "AttachmentPUT", name))) {
            throwError("InvalidOperationException",
                "Cannot delete attachment " + name + " of document "
                + entityOrId + ", there is a deferred command registered to create an attachment with the same name.");
        }

        this.defer(new DeleteAttachmentCommandData(entityOrId, name, null));
    }
}
