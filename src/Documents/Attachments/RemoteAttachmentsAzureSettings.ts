import { IRemoteAttachmentsSettings } from "./IRemoteAttachmentsSettings.js";

/**
 * Configuration settings for storing attachments in Azure Blob Storage as part of the remote attachments feature.
 *
 * This class configures the remote storage destination for attachments using Microsoft Azure Blob Storage.
 * Remote attachments allow offloading large attachment files from the local RavenDB database to cloud storage,
 * helping to reduce database size and improve performance for scenarios with many or large attachments.
 *
 * Azure authentication can be configured using either:
 * - Account Key: Using accountName and accountKey
 * - Shared Access Signature (SAS): Using accountName and sasToken
 */
export class RemoteAttachmentsAzureSettings implements IRemoteAttachmentsSettings {
    /**
     * The name of the Azure Blob Storage container where attachments will be stored.
     *
     * The storage container name must follow Azure Blob Storage naming rules:
     * - Must be between 3 and 63 characters long
     * - Must contain only lowercase letters, numbers, and dashes
     * - Must start and end with a letter or number
     * - Cannot contain consecutive dashes
     *
     * This property is required for the configuration to be valid.
     */
    public storageContainer: string;

    /**
     * Optional subfolder path within the storage container for organizing attachments.
     *
     * This property allows you to organize attachments into a specific folder structure within the Azure container.
     * For example, you might use different folder names for different databases, environments, or tenants.
     * The folder path can include forward slashes to create a multi-level directory structure.
     *
     * Example: "production/database1" or "attachments/2024"
     */
    public remoteFolderName?: string;

    /**
     * The Azure storage account name.
     *
     * This is required for authentication and is used in combination with either accountKey or sasToken.
     * The storage account must have the appropriate permissions to create and write blobs to the specified container.
     */
    public accountName: string;

    /**
     * The Azure storage account key for authentication.
     *
     * The account key provides full access to the storage account. Use this property when authenticating
     * with the primary or secondary access key from your Azure storage account.
     *
     * Security Warning: Store this securely and never commit to source control.
     * Either accountKey or sasToken must be provided, but not both.
     */
    public accountKey?: string;

    /**
     * The Shared Access Signature (SAS) token for authentication.
     *
     * SAS tokens provide limited access to resources in your storage account with specific permissions
     * and expiration time. This is the recommended approach for production environments as it provides
     * more granular control over access.
     *
     * Either accountKey or sasToken must be provided, but not both.
     */
    public sasToken?: string;

    public isConfigured(): boolean {
        return !!this.storageContainer && !!this.accountName && (!!this.accountKey || !!this.sasToken);
    }
}
