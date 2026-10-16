import { AttachmentEnumeratorResult, AttachmentResult } from "../Attachments/index.js";
import { AttachmentRequest } from "../Operations/Attachments/AttachmentRequest.js";
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
     * Returns the requested attachments in a single request. Missing attachments are skipped.
     * Each attachment's data stream is valid only until the next one is requested from the iterator.
     */
    get(attachments: AttachmentRequest[]): Promise<AsyncGenerator<AttachmentEnumeratorResult>>;

    /**
     * Returns the inclusive byte range [from, to] of the attachment by the document id and attachment name.
     * When to is null the range ends at the last byte; when from is null, to is a suffix length (the last to bytes).
     */
    getRange(documentId: string, name: string, from: number | null, to: number | null): Promise<AttachmentResult | null>;

    /**
     * Returns the inclusive byte range [from, to] of the attachment by the entity and attachment name.
     * When to is null the range ends at the last byte; when from is null, to is a suffix length (the last to bytes).
     */
    getRange(entity: object, name: string, from: number | null, to: number | null): Promise<AttachmentResult | null>;

    /**
     * Returns the revision attachment by the document id and attachment name.
     */
    getRevision(documentId: string, name: string, changeVector: string): Promise<AttachmentResult | null>;
}
