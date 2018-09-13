import { AttachmentName, AttachmentResult } from "../Attachments";
import { AttachmentData } from "./../Attachments";

export interface IAttachmentsSessionOperations {
    //TBD:
    /**
     * Returns the attachments info of a document.
     * @param entity Entity to use
     * @return attachments names
     */
    getNames(entity: object): AttachmentName[];
    /**
     * Check if attachment exists
     * @param documentId Document Id
     * @param name Attachment name
     * @return true, if attachment exists
     */
    exists(documentId: string, name: string): Promise<boolean>;
    /**
     * Returns the attachment by the document id and attachment name.
     * @param documentId Document Id
     * @param name Name of attachment
     * @return Attachment
     */
    get(documentId: string, name: string): Promise<AttachmentResult>;
    /**
     * Returns the attachment by the entity and attachment name.
     * @param entity Entity
     * @param name Name of attachment
     * @return Attachment
     */
    get(entity: object, name: string): Promise<AttachmentResult>;
    //TBD AttachmentResult GetRevision(string documentId, string name, string changeVector);
    /**
     * Stores attachment to be sent in the session.
     * @param documentId Document Id
     * @param name Name of attachment
     * @param stream Attachment stream
     */
    store(documentId: string, name: string, stream: AttachmentData): void;
    /**
     * Stores attachment to be sent in the session.
     * @param documentId Document Id
     * @param name Name of attachment
     * @param stream Attachment stream
     * @param contentType Content type
     */
    store(documentId: string, name: string, stream: AttachmentData, contentType: string): void;
    /**
     * Stores attachment to be sent in the session.
     * @param entity Entity
     * @param name Name of attachment
     * @param stream Attachment stream
     */
    store(entity: object, name: string, stream: AttachmentData): void;
    /**
     * Stores attachment to be sent in the session.
     * @param entity Entity
     * @param name Name of attachment
     * @param stream Attachment stream
     * @param contentType Content type
     */
    store(entity: object, name: string, stream: AttachmentData, contentType: string): void;
    /**
     * Marks the specified document's attachment for deletion. The attachment will be deleted when
     * saveChanges is called.
     * @param documentId the document which holds the attachment
     * @param name the attachment name
     */
    delete(documentId: string, name: string): void;
    /**
     * Marks the specified document's attachment for deletion. The attachment will be deleted when
     * saveChanges is called.
     * @param entity instance of entity of the document which holds the attachment
     * @param name the attachment name
     */
    delete(entity: object, name: string): void;
}