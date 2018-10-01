import { AttachmentName, AttachmentResult } from "../Attachments";
import { AttachmentData } from "./../Attachments";
import { AbstractCallback } from "../../Types/Callbacks";

export interface IAttachmentsSessionOperations {
    /**
     * Returns the attachments info of a document.
     */
    getNames(entity: object): AttachmentName[];
    
    /**
     * Check if attachment exists
     */
    exists(documentId: string, name: string): Promise<boolean>;

    /**
     * Check if attachment exists
     */
    exists(documentId: string, name: string, callback: AbstractCallback<boolean>): Promise<boolean>;
    
    /**
     * Returns the attachment by the document id and attachment name.
     */
    get(documentId: string, name: string): Promise<AttachmentResult>;
    
    /**
     * Returns the attachment by the entity and attachment name.
     */
    get(entity: object, name: string): Promise<AttachmentResult>;
    
    /**
     * Returns the attachment by the document id and attachment name.
     */
    get(documentId: string, name: string, callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;
    
    /**
     * Returns the attachment by the entity and attachment name.
     */
    get(entity: object, name: string, callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;

    /**
     * Returns the revision attachment by the document id and attachment name.
     */
    getRevision(documentId: string, name: string, changeVector: string): Promise<AttachmentResult>;

    /**
     * Returns the revision attachment by the document id and attachment name.
     */
    getRevision(documentId: string, name: string, changeVector: string,
                callback: AbstractCallback<AttachmentResult>): Promise<AttachmentResult>;

    /**
     * Stores attachment to be sent in the session.
     */
    store(documentId: string, name: string, stream: AttachmentData): void;
    
    /**
     * Stores attachment to be sent in the session.
     */
    store(documentId: string, name: string, stream: AttachmentData, contentType: string): void;
    
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
}
