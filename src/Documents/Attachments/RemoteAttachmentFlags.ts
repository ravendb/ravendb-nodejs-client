/**
 * Flags that indicate the location and characteristics of an attachment.
 */
export enum RemoteAttachmentFlags {
    /**
     * No flags are set. The attachment is stored locally.
     */
    None = 0,

    /**
     * The attachment is stored remotely in cloud storage rather than in the local database.
     */
    Remote = 0x1
}
