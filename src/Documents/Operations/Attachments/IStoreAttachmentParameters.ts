import { AttachmentData } from "../../Attachments/index.js";
import { RemoteAttachmentParameters } from "./RemoteAttachmentParameters.js";

/**
 * Interface for storing attachment parameters.
 */
export interface IStoreAttachmentParameters {
    /**
     * The name of the attachment.
     */
    name: string;

    /**
     * The attachment content stream or buffer.
     */
    stream: AttachmentData;

    /**
     * Optional content type (MIME type) of the attachment.
     */
    contentType?: string;

    /**
     * Optional change vector for optimistic concurrency control.
     */
    changeVector?: string;

    /**
     * Optional parameters for remote cloud storage upload.
     */
    remoteParameters?: RemoteAttachmentParameters;
}
