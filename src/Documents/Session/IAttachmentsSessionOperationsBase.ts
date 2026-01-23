import { AttachmentName, AttachmentData } from "../Attachments/index.js";
import { StoreAttachmentParameters } from "../Operations/Attachments/StoreAttachmentParameters.js";

export interface IAttachmentsSessionOperationsBase {
    /**
     * Returns the attachments info of a document.
     */
    getNames(entity: object): AttachmentName[];

    /**
     * Stores attachment to be sent in the session.
     */
    store(documentId: string, name: string, stream: AttachmentData): void;

    /**
     * Stores attachment to be sent in the session.
     */
    store(documentId: string, name: string, stream: AttachmentData, contentType: string): void;

    /**
     * Stores attachment to be sent in the session using the provided parameters.
     * This overload provides a convenient way to store an attachment using a StoreAttachmentParameters object,
     * which encapsulates all attachment properties including optional settings like content type,
     * change vector for concurrency control, and remote parameters for scheduling remote cloud storage uploads.
     */
    store(documentId: string, parameters: StoreAttachmentParameters): void;

    /**
     * Stores attachment to be sent in the session.
     */
    store(entity: object, name: string, stream: AttachmentData): void;

    /**
     * Stores attachment to be sent in the session.
     */
    store(entity: object, name: string, stream: AttachmentData, contentType: string): void;

    /**
     * Marks the specified document's attachment for deletion. The attachment will be deleted when
     * saveChanges is called.
     */
    delete(documentId: string, name: string): void;

    /**
     * Marks the specified document's attachment for deletion. The attachment will be deleted when
     * saveChanges is called.
     */
    delete(entity: object, name: string): void;

    /**
     * Marks the specified document's attachment for rename. The attachment will be renamed when saveChanges is called.
     */
    rename(documentId: string, name: string, newName: string): void;

    /**
     * Marks the specified document's attachment for rename. The attachment will be renamed when saveChanges is called.
     */
    rename(entity: object, name: string, newName: string): void;

    /**
     * Moves specified source document attachment to destination document.
     * The operation will be executed when saveChanges is called.
     */
    move(sourceEntity: object, sourceName: string, destinationEntity: object, destinationName: string): void;

    /**
     * Moves specified source document attachment to destination document.
     * The operation will be executed when saveChanges is called.
     */
    move(sourceDocumentId: string, sourceName: string, destinationDocumentId: string, destinationName: string): void;

    /**
     * Copies specified source document attachment to destination document.
     * The operation will be executed when saveChanges is called.
     */
    copy(sourceDocumentId: string, sourceName: string, destinationDocumentId: string, destinationName: string): void;

    /**
     * Copies specified source document attachment to destination document.
     * The operation will be executed when saveChanges is called.
     */
    copy(sourceEntity: object, sourceName: string, destinationEntity: object, destinationName: string): void;
}
