/**
 * Interface for AI settings with common properties across providers.
 */
export interface IAiSettings {
    apiKey?: string;
    model: string;
    endpoint?: string;
    getBaseEndpointUri(): string;
}
