/**
 * Connection settings for Azure Queue Storage.
 * Exactly one authentication method must be configured:
 * connectionString, entraId, or passwordless.
 */
export interface AzureQueueStorageConnectionSettings {
    /**
     * Azure Storage connection string (with DefaultEndpointsProtocol and AccountName/QueueEndpoint).
     */
    connectionString?: string;

    /**
     * Microsoft Entra ID (service principal) authentication.
     */
    entraId?: EntraId;

    /**
     * Passwordless (Managed Identity) authentication.
     */
    passwordless?: Passwordless;
}

export interface EntraId {
    storageAccountName: string;
    tenantId: string;
    clientId: string;
    clientSecret: string;
}

/**
 * Used for machine authentication (Managed Identity).
 */
export interface Passwordless {
    storageAccountName: string;
}
