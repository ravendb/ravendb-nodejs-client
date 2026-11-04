import { AttachmentResult } from "../Attachments/index.js";
import { IAttachmentsSessionOperationsBase } from "./IAttachmentsSessionOperationsBase.js";

export interface IAttachmentsSessionOperations extends IAttachmentsSessionOperationsBase {
    /**
     * Check if attachment exists
     */
    exists(documentId: string, name: string): Promise<boolean>;

    /**
     * Returns the attachment by the document id and attachment name.
     */
    get(documentId: string, name: string): Promise<AttachmentResult | null>;

    /**
     * Returns the attachment by the entity and attachment name.
     */
    get(entity: object, name: string): Promise<AttachmentResult | null>;

    /**
     * Returns the inclusive byte range [from, to] of the attachment by the document id and attachment name.
     * Pass null for an open bound.
     */
    getRange(documentId: string, name: string, from: number | null, to: number | null): Promise<AttachmentResult | null>;

    /**
     * Returns the inclusive byte range [from, to] of the attachment by the entity and attachment name.
     * Pass null for an open bound.
     */
    getRange(entity: object, name: string, from: number | null, to: number | null): Promise<AttachmentResult | null>;

    /**
     * Returns the revision attachment by the document id and attachment name.
     */
    getRevision(documentId: string, name: string, changeVector: string): Promise<AttachmentResult | null>;
}
