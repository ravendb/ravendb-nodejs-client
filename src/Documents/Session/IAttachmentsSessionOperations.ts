import { AttachmentName, AttachmentResult } from "../Attachments";
import { AttachmentData } from "./../Attachments";
import { ErrorFirstCallback } from "../../Types/Callbacks";
import { IAttachmentsSessionOperationsBase } from "./IAttachmentsSessionOperationsBase";

export interface IAttachmentsSessionOperations extends IAttachmentsSessionOperationsBase {
    /**
     * Check if attachment exists
     */
    exists(documentId: string, name: string): Promise<boolean>;

    /**
     * Check if attachment exists
     */
    exists(documentId: string, name: string, callback: ErrorFirstCallback<boolean>): Promise<boolean>;

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
    get(documentId: string, name: string, callback: ErrorFirstCallback<AttachmentResult>): Promise<AttachmentResult>;

    /**
     * Returns the attachment by the entity and attachment name.
     */
    get(entity: object, name: string, callback: ErrorFirstCallback<AttachmentResult>): Promise<AttachmentResult>;

    /**
     * Returns the revision attachment by the document id and attachment name.
     */
    getRevision(documentId: string, name: string, changeVector: string): Promise<AttachmentResult>;

    /**
     * Returns the revision attachment by the document id and attachment name.
     */
    getRevision(documentId: string, name: string, changeVector: string,
                callback: ErrorFirstCallback<AttachmentResult>): Promise<AttachmentResult>;
}
