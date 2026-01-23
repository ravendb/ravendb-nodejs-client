import { RemoteAttachmentsAzureSettings } from "./RemoteAttachmentsAzureSettings.js";
import { RemoteAttachmentsS3Settings } from "./RemoteAttachmentsS3Settings.js";

/**
 * Configuration for a single remote attachment storage destination.
 *
 * A destination can be either Azure Blob Storage or Amazon S3, but not both.
 * Each destination can be individually disabled without removing its configuration.
 */
export class RemoteAttachmentsDestinationConfiguration {
    /**
     * Whether this destination is disabled.
     * When true, attachments will not be uploaded to this destination.
     */
    public disabled: boolean;

    /**
     * Amazon S3 storage settings.
     * Either s3Settings or azureSettings must be configured, but not both.
     */
    public s3Settings?: RemoteAttachmentsS3Settings;

    /**
     * Azure Blob Storage settings.
     * Either s3Settings or azureSettings must be configured, but not both.
     */
    public azureSettings?: RemoteAttachmentsAzureSettings;

    /**
     * Checks if this destination has a configured uploader.
     */
    public hasUploader(): boolean {
        if (this.disabled) {
            return false;
        }

        return (this.s3Settings?.isConfigured() ?? false) || (this.azureSettings?.isConfigured() ?? false);
    }

    /**
     * Validates the destination configuration.
     * @throws Error if configuration is invalid
     */
    public assertConfiguration(key: string, databaseName?: string): void {
        const databaseStr = databaseName ? ` for database '${databaseName}'` : "";

        const s3Configured = this.s3Settings?.isConfigured() ?? false;
        const azureConfigured = this.azureSettings?.isConfigured() ?? false;

        if (!s3Configured && !azureConfigured) {
            throw new Error(
                `Exactly one uploader for RemoteAttachmentsDestinationConfiguration '${key}'${databaseStr} must be configured.`
            );
        }

        if (s3Configured && azureConfigured) {
            throw new Error(
                `Only one uploader for RemoteAttachmentsDestinationConfiguration '${key}'${databaseStr} can be configured.`
            );
        }
    }
}
