import { AdvancedSessionExtensionBase } from "./AdvancedSessionExtensionBase";
import { AttachmentName } from "./../Attachments";
import { AttachmentData } from "./../Attachments";
import { CONSTANTS } from "./../../Constants";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { StringUtil } from "../../Utility/StringUtil";
import { throwError } from "../../Exceptions";
import { IdTypeAndName } from "../IdTypeAndName";
import { DocumentInfo } from "./DocumentInfo";
import { PutAttachmentCommandData } from "../Commands/Batches/PutAttachmentCommandData";
import { DeleteAttachmentCommandData } from "../Commands/Batches/DeleteAttachmentCommandData";
import { MoveAttachmentCommandData } from "../Commands/Batches/MoveAttachmentCommandData";
import { CopyAttachmentCommandData } from "../Commands/Batches/CopyAttachmentCommandData";

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

        if (StringUtil.isNullOrWhitespace(documentIdOrEntity)) {
            throwError("InvalidArgumentException", "DocumentId cannot be null");
        }

        if (StringUtil.isNullOrWhitespace(name)) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(documentIdOrEntity, "DELETE", null))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                documentIdOrEntity, name, "store", "delete");
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(documentIdOrEntity, "AttachmentPUT", name))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                documentIdOrEntity, name, "store", "create");
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(documentIdOrEntity, "AttachmentDELETE", name))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                documentIdOrEntity, name, "store", "delete");
        }

        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(documentIdOrEntity, "AttachmentMOVE", name))) {
           DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
               documentIdOrEntity, name, "store", "rename");
        }

        const documentInfo: DocumentInfo = this._documentsById.getValue(documentIdOrEntity);
        if (documentInfo && this._deletedEntities.has(documentInfo.entity)) {
            DocumentSessionAttachmentsBase._throwDocumentAlreadyDeleted(
                documentIdOrEntity, name, "store", null, documentIdOrEntity);
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
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(entityOrId, name, "delete", "create");
        }
        
        if (this._deferredCommandsMap.has(IdTypeAndName.keyFor(entityOrId, "AttachmentMOVE", name))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                entityOrId, name, "delete", "rename");
        }

        this.defer(new DeleteAttachmentCommandData(entityOrId, name, null));
    }

    public rename(documentId: string, name: string, newName: string): void;
    public rename(entity: object, name: string, newName: string): void;
    public rename(entityOrId: object | string, name: string, newName: string): void {
        this.move(entityOrId as any, name, entityOrId as any, newName);
    }

    public move(
        sourceEntity: object, 
        sourceName: string, 
        destinationEntity: object, 
        destinationName: string): void;
    public move(
        sourceDocumentId: string, 
        sourceName: string, 
        destinationDocumentId: string, 
        destinationName: string): void;
    public move(
        sourceEntityOrId: object | string, 
        sourceName: string, 
        destinationEntityOrId: object | string, 
        destinationName: string): void {
            return typeof sourceEntityOrId === "string"
                ? this._moveByEntityIds(
                    sourceEntityOrId, sourceName, destinationEntityOrId as string, destinationName)
                : this._moveByEntities(
                    sourceEntityOrId as object, sourceName, destinationEntityOrId as object, destinationName);
    }

    private _moveByEntities(
        sourceEntity: object, sourceName: string, destinationEntity: object, destinationName: string): void {
        if (!sourceEntity) {
            throwError("InvalidArgumentException", "SourceEntity cannot be null");
        }

        if (!destinationEntity) {
            throwError("InvalidArgumentException", "DestinationEntity cannot be null");
        }

        const sourceDocument = this._documentsByEntity.get(sourceEntity);
        if (!sourceDocument) {
            this._throwEntityNotInSession(sourceEntity);
        }

        const destinationDocument = this._documentsByEntity.get(destinationEntity);
        if (destinationDocument) {
            this._throwEntityNotInSession(destinationEntity);
        }

        this._moveByEntityIds(sourceDocument.id, sourceName, destinationDocument.id, destinationName);
    }

    private _moveByEntityIds(
        sourceDocumentId: string, sourceName: string, destinationDocumentId: string, destinationName: string) {
        if (StringUtil.isNullOrWhitespace(sourceDocumentId)) {
            throwError("InvalidArgumentException", "SourceDocumentId is required.");
        }

        if (StringUtil.isNullOrWhitespace(sourceName)) {
            throwError("InvalidArgumentException", "SourceName is required.");
        }

        if (StringUtil.isNullOrWhitespace(destinationDocumentId)) {
            throwError("InvalidArgumentException", "DestinationDocumentId is required.");
        }

        if (StringUtil.isWhitespace(destinationName)) {
            throwError("InvalidArgumentException", "DestinationName is required.");
        }
        
        if (sourceDocumentId.toLowerCase() === destinationDocumentId.toLowerCase() 
            && sourceName === destinationName) {
            return; // no-op
        }

        const sourceDocument = this._documentsById.getValue(sourceDocumentId);
        if (sourceDocument && this._deletedEntities.has(sourceDocument.entity)) {
            DocumentSessionAttachmentsBase._throwDocumentAlreadyDeleted(
                sourceDocumentId, sourceName, "move", destinationDocumentId, sourceDocumentId);
        }

        const destinationDocument = this._documentsById.getValue(destinationDocumentId);
        if (destinationDocument && this._deletedEntities.has(destinationDocument.entity)) {
            DocumentSessionAttachmentsBase._throwDocumentAlreadyDeleted(
                sourceDocumentId, sourceName, "move", destinationDocumentId, destinationDocumentId);
        }

        if (this._deferredCommandsMap.has(
            IdTypeAndName.keyFor(sourceDocumentId, "AttachmentDELETE", sourceName))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                sourceDocumentId, sourceName, "rename", "delete");
        }

        if (this._deferredCommandsMap.has(
            IdTypeAndName.keyFor(sourceDocumentId, "AttachmentMOVE", sourceName))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                sourceDocumentId, sourceName, "rename", "rename");
        }
        
        if (this._deferredCommandsMap.has(
            IdTypeAndName.keyFor(destinationDocumentId, "AttachmentDELETE", destinationName))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                sourceDocumentId, destinationName, "rename", "delete");
        }

        if (this._deferredCommandsMap.has(
            IdTypeAndName.keyFor(destinationDocumentId, "AttachmentMOVE", destinationName))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                sourceDocumentId, destinationName, "rename", "rename");
        }

        const cmdData = new MoveAttachmentCommandData(
            sourceDocumentId, sourceName, destinationDocumentId, destinationName, null);
        this.defer(cmdData);
    }

    public copy(
        sourceEntity: object, 
        sourceName: string, 
        destinationEntity: object, 
        destinationName: string): void;
    public copy(
        sourceId: string, 
        sourceName: string, 
        destinationId: string, 
        destinationName: string): void;
    public copy(
        sourceEntityOrId: object | string, 
        sourceName: string, 
        destinationEntityOrId: object | string, 
        destinationName: string): void {
            return typeof sourceEntityOrId === "string"
                ? this._copyByEntityIds(
                    sourceEntityOrId, sourceName, destinationEntityOrId as string, destinationName)
                : this._copyByEntities(
                    sourceEntityOrId as object, sourceName, destinationEntityOrId as object, destinationName);
    }

    private _copyByEntities(
        sourceEntity: object, 
        sourceName: string, 
        destinationEntity: object, 
        destinationName: string): void {
        if (!sourceEntity) {
            throwError("InvalidArgumentException", "SourceEntity cannot be null");
        }

        if (!destinationEntity) {
            throwError("InvalidArgumentException", "DestinationEntity cannot be null");
        }

        const sourceDocument = this._documentsByEntity.get(sourceEntity);
        if (!sourceDocument) {
            this._throwEntityNotInSession(sourceEntity);
        }

        const destinationDocument = this._documentsByEntity.get(destinationEntity);
        if (destinationDocument) {
            this._throwEntityNotInSession(destinationEntity);
        }
        
        this.copy(sourceDocument.id, sourceName, destinationDocument.id, destinationName);
    }

    private _copyByEntityIds(
        sourceDocumentId: string, 
        sourceName: string, 
        destinationDocumentId: string, 
        destinationName: string): void {
        if (StringUtil.isNullOrWhitespace(sourceDocumentId)) {
            throwError("InvalidArgumentException", "SourceDocumentId is required.");
        }

        if (StringUtil.isNullOrWhitespace(sourceName)) {
            throwError("InvalidArgumentException", "SourceName is required.");
        }

        if (StringUtil.isNullOrWhitespace(destinationDocumentId)) {
            throwError("InvalidArgumentException", "DestinationDocumentId is required.");
        }

        if (StringUtil.isWhitespace(destinationName)) {
            throwError("InvalidArgumentException", "DestinationName is required.");
        }

        if (sourceDocumentId.toLowerCase() === destinationDocumentId.toLowerCase() 
            && sourceName === destinationName) {
            return; // no-op
        }

        const sourceDocument = this._documentsById.getValue(sourceDocumentId);
        if (sourceDocument && this._deletedEntities.has(sourceDocument.entity)) {
            DocumentSessionAttachmentsBase._throwDocumentAlreadyDeleted(
                sourceDocumentId, sourceName, "copy", destinationDocumentId, sourceDocumentId);
        }

        const destinationDocument = this._documentsById.getValue(destinationDocumentId);
        if (destinationDocument && this._deletedEntities.has(destinationDocument.entity)) {
            DocumentSessionAttachmentsBase._throwDocumentAlreadyDeleted(
                sourceDocumentId, sourceName, "copy", destinationDocumentId, destinationDocumentId);
        }

        if (this._deferredCommandsMap.has(
            IdTypeAndName.keyFor(sourceDocumentId, "AttachmentDELETE", sourceName))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                sourceDocumentId, sourceName, "copy", "delete");
        }

        if (this._deferredCommandsMap.has(
            IdTypeAndName.keyFor(sourceDocumentId, "AttachmentMOVE", sourceName))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                sourceDocumentId, sourceName, "copy", "rename");
        }
        
        if (this._deferredCommandsMap.has(
            IdTypeAndName.keyFor(destinationDocumentId, "AttachmentDELETE", destinationName))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                sourceDocumentId, destinationName, "copy", "delete");
        }

        if (this._deferredCommandsMap.has(
            IdTypeAndName.keyFor(destinationDocumentId, "AttachmentMOVE", destinationName))) {
            DocumentSessionAttachmentsBase._throwOtherDeferredCommandException(
                sourceDocumentId, destinationName, "copy", "rename");
        }

        const cmdData = new CopyAttachmentCommandData(
            sourceDocumentId, sourceName, destinationDocumentId, destinationName, null);
        this.defer(cmdData);
    }

    private static _throwDocumentAlreadyDeleted(
        documentId: string, 
        name: string, 
        operation: string, 
        destinationDocumentId: string, 
        deletedDocumentId: string): void {
        throwError("InvalidOperationException", 
            "Can't " + operation + " attachment '" + name + "' of document '" + documentId + "' " +
                (destinationDocumentId ? " to '" + destinationDocumentId + "'" : "") +
                ", the document '" + deletedDocumentId + "' was already deleted in this session");
    }

    private static _throwOtherDeferredCommandException(
         documentId: string, 
         name: string, 
         operation: string, 
         previousOperation: string): void {
        throwError("InvalidOperationException",
            "Can't " + operation + " attachment '" + name + "' of document '"
            + documentId + "', there is a deferred command registered to " 
            + previousOperation + " an attachment with '" + name + "' name.");
    }
}
