/**
 * Connection settings for Azure Service Bus.
 * Exactly one authentication method must be configured:
 * connectionString, entraId, or passwordless.
 */
export interface AzureServiceBusConnectionSettings {
    /**
     * Azure Service Bus connection string (contains an sb:// endpoint).
     */
    connectionString?: string;

    /**
     * Microsoft Entra ID (service principal) authentication.
     */
    entraId?: AzureServiceBusEntraId;

    /**
     * Passwordless (Managed Identity) authentication.
     */
    passwordless?: AzureServiceBusPasswordless;
}

export interface AzureServiceBusEntraId {
    /**
     * Fully qualified Service Bus namespace, e.g. "mynamespace.servicebus.windows.net".
     */
    namespace: string;
    tenantId: string;
    clientId: string;
    clientSecret: string;
}

/**
 * Used for machine authentication (Managed Identity).
 */
export interface AzureServiceBusPasswordless {
    /**
     * Fully qualified Service Bus namespace, e.g. "mynamespace.servicebus.windows.net".
     */
    namespace: string;
}
