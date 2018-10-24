import { AttachmentName, AttachmentResult } from "../Attachments";
import { AttachmentData } from "./../Attachments";
import { AbstractCallback } from "../../Types/Callbacks";
import { IAttachmentsSessionOperationsBase } from "./IAttachmentsSessionOperationsBase";

export interface IAttachmentsSessionOperations extends IAttachmentsSessionOperationsBase {
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
}
