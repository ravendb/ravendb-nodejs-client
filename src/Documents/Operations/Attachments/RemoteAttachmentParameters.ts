import { RemoteAttachmentFlags } from "../../Attachments/RemoteAttachmentFlags.js";

/**
 * Parameters for configuring remote attachment upload behavior.
 *
 * These parameters specify when and where an attachment should be uploaded to remote cloud storage.
 */
export class RemoteAttachmentParameters {
    /**
     * The identifier of the remote storage destination configuration.
     * This references a configured destination in RemoteAttachmentsConfiguration.
     */
    public identifier: string;

    /**
     * Flags controlling remote attachment behavior.
     * @internal
     */
    private readonly _flags: RemoteAttachmentFlags;

    /**
     * Optional scheduled upload time (UTC).
     * When specified, the attachment will be uploaded at this time rather than immediately.
     */
    public at?: Date;

    constructor(identifier: string, at?: Date) {
        this.identifier = identifier;
        this._flags = RemoteAttachmentFlags.None; // Always set to None for user-created instances
        this.at = at;
    }

    /**
     * Gets the flags value (for internal use only).
     * @internal
     */
    public get flags(): RemoteAttachmentFlags {
        return this._flags;
    }
}
