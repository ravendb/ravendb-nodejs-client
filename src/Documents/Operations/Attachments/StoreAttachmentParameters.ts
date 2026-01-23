import { AttachmentData } from "../../Attachments/index.js";
import { IStoreAttachmentParameters } from "./IStoreAttachmentParameters.js";
import { RemoteAttachmentParameters } from "./RemoteAttachmentParameters.js";

/**
 * Parameters for storing an attachment with optional remote cloud storage upload configuration.
 *
 * This class encapsulates all properties needed to store an attachment, including optional
 * settings like content type, change vector for concurrency control, and remote parameters
 * for scheduling cloud storage uploads.
 */
export class StoreAttachmentParameters implements IStoreAttachmentParameters {
    /**
     * The name of the attachment.
     */
    public name: string;

    /**
     * The attachment content stream or buffer.
     */
    public stream: AttachmentData;

    /**
     * Optional content type (MIME type) of the attachment.
     * Examples: "image/png", "application/pdf", "text/plain"
     */
    public contentType?: string;

    /**
     * Optional change vector for optimistic concurrency control.
     * When specified, the attachment will only be stored if the document's
     * change vector matches this value.
     */
    public changeVector?: string;

    /**
     * Optional parameters for scheduling remote cloud storage upload.
     * When specified, the attachment can be uploaded to configured S3 or Azure storage.
     */
    public remoteParameters?: RemoteAttachmentParameters;

    constructor(name: string, stream: AttachmentData, contentType?: string, changeVector?: string, remoteParameters?: RemoteAttachmentParameters) {
        this.name = name;
        this.stream = stream;
        this.contentType = contentType;
        this.changeVector = changeVector;
        this.remoteParameters = remoteParameters;
    }
}
