import { AttachmentName, AttachmentResult } from "../Attachments";
import { AttachmentData } from "./../Attachments";
import { AbstractCallback } from "../../Types/Callbacks";

export interface IAttachmentsSessionOperations {
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
     * Check if attachment exists
     * @param documentId Document Id
     * @param name Attachment name
     * @param callback Callback
     * @return true, if attachment exists
     */
    exists(documentId: string, name: string, callback: AbstractCallback<boolean>): Promise<boolean>;
    
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
    
    /**
     * Returns the attachment by the document id and attachment name.
     * @param documentId Document Id
     * @param name Name of attachment
     * @param callback Callback
     * @return Attachment
     */
    get(documentId: string, name: string, callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;
    
    /**
     * Returns the attachment by the entity and attachment name.
     * @param entity Entity
     * @param name Name of attachment
     * @param callback Callback
     * @return Attachment
     */
    get(entity: object, name: string, callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;

    /**
     * Returns the revision attachment by the document id and attachment name.
     * @param documentId Document Id
     * @param name Name of attachment
     * @param changeVector Change vector
     * @return Attachment
     */
    getRevision(documentId: string, name: string, changeVector: string): Promise<AttachmentResult>;

    /**
     * Returns the revision attachment by the document id and attachment name.
     * @param documentId Document Id
     * @param name Name of attachment
     * @param changeVector Change vector
     * @param callback Callback
     * @return Attachment
     */
    getRevision(documentId: string, name: string, changeVector: string,
                callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;

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
