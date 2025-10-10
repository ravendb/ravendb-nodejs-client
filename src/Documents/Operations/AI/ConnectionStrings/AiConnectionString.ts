import { ConnectionString, ConnectionStringType } from "../../Etl/ConnectionString.js";
import { AiConnectorType } from "./AiConnectorType.js";
import { AiModelType } from "./AiModelType.js";
import { AiSettingsCompareDifferences } from "./AiSettingsCompareDifferences.js";
import { OpenAiSettings } from "./Settings/OpenAiSettings.js";
import { AzureOpenAiSettings } from "./Settings/AzureOpenAiSettings.js";
import { OllamaSettings } from "./Settings/OllamaSettings.js";
import { EmbeddedSettings } from "./Settings/EmbeddedSettings.js";
import { GoogleSettings } from "./Settings/GoogleSettings.js";
import { HuggingFaceSettings } from "./Settings/HuggingFaceSettings.js";
import { MistralAiSettings } from "./Settings/MistralAiSettings.js";
import { VertexSettings } from "./Settings/VertexSettings.js";


const PROVIDER_KEYS = [
    "openAiSettings",
    "azureOpenAiSettings",
    "ollamaSettings",
    "embeddedSettings",
    "googleSettings",
    "huggingFaceSettings",
    "mistralAiSettings",
    "vertexSettings"
] as const;

/**
 * Represents an AI service connection string configuration.
 * Supports multiple AI providers (OpenAI, Azure OpenAI, Ollama, Google, HuggingFace, Mistral AI, Vertex AI, Embedded).
 * Only one provider can be configured per connection string.
 */
export class AiConnectionString extends ConnectionString {
    public identifier?: string;
    public openAiSettings?: OpenAiSettings;
    public azureOpenAiSettings?: AzureOpenAiSettings;
    public ollamaSettings?: OllamaSettings;
    public embeddedSettings?: EmbeddedSettings;
    public googleSettings?: GoogleSettings;
    public huggingFaceSettings?: HuggingFaceSettings;
    public mistralAiSettings?: MistralAiSettings;
    public vertexSettings?: VertexSettings;
    public modelType?: AiModelType;
    public type: ConnectionStringType = "Ai"

    /**
     * Validates the connection string configuration.
     * Ensures exactly one AI provider is configured and all provider-specific fields are valid.
     * @returns Array of validation error messages (empty if valid)
     */
    public validate(): string[] {
        const errors: string[] = [];

        const allSettings = PROVIDER_KEYS
            .map(key => this[key])
            .filter(Boolean);

        for (const setting of allSettings) {
            setting.validate(errors);
        }

        if (allSettings.length === 0) {
            errors.push(`At least one of the following settings must be set: ${PROVIDER_KEYS.join(", ")}`);
        } else if (allSettings.length > 1) {
            const configuredSettingsNames = PROVIDER_KEYS.filter(
                key => Boolean(this[key])
            );
            errors.push(`Only one of the following settings can be set: ${configuredSettingsNames.join(", ")}`);
        }

        return errors;
    }

    /**
     * Gets the type of the active AI provider.
     * @returns The connector type of the configured provider, or "None" if none configured
     */
    public getActiveProvider(): AiConnectorType {
        if (this.openAiSettings) return "OpenAi";
        if (this.azureOpenAiSettings) return "AzureOpenAi";
        if (this.ollamaSettings) return "Ollama";
        if (this.embeddedSettings) return "Embedded";
        if (this.googleSettings) return "Google";
        if (this.huggingFaceSettings) return "HuggingFace";
        if (this.mistralAiSettings) return "MistralAi";
        if (this.vertexSettings) return "Vertex";
        return "None";
    }

    /**
     * Gets the active provider settings instance.
     * @returns The configured provider settings, or undefined if none configured
     */
    public getActiveProviderInstance() {
        return this.openAiSettings ??
            this.azureOpenAiSettings ??
            this.ollamaSettings ??
            this.embeddedSettings ??
            this.googleSettings ??
            this.huggingFaceSettings ??
            this.mistralAiSettings ??
            this.vertexSettings;
    }

    /**
     * Compares this connection string with another to detect differences.
     * @param newConnectionString The connection string to compare with
     * @returns Flags indicating which settings differ
     */
    public compare(newConnectionString: AiConnectionString | null | undefined): AiSettingsCompareDifferences {
        if (!newConnectionString) {
            return AiSettingsCompareDifferences.All;
        }

        let result = AiSettingsCompareDifferences.None;

        if (this.identifier !== newConnectionString.identifier) {
            result |= AiSettingsCompareDifferences.Identifier;
        }

        if (this.modelType !== newConnectionString.modelType) {
            result |= AiSettingsCompareDifferences.ModelArchitecture;
        }

        const oldProvider = this.getActiveProvider();
        const newProvider = newConnectionString.getActiveProvider();

        if (oldProvider !== newProvider) {
            return AiSettingsCompareDifferences.All;
        }

        const oldInstance = this.getActiveProviderInstance();
        const newInstance = newConnectionString.getActiveProviderInstance();

        if (!oldInstance || !newInstance) {
            return AiSettingsCompareDifferences.All;
        }

        result |= oldInstance.compare(newInstance);

        return result;
    }

    /**
     * Checks if this connection string is equal to another.
     * @param connectionString The connection string to compare with
     * @returns true if the connection strings are equal, false otherwise
     */
    public isEqual(connectionString: ConnectionString): boolean {
        if (!(connectionString instanceof AiConnectionString)) {
            return false;
        }

        if (this.name !== connectionString.name) {
            return false;
        }

        if (this.identifier !== connectionString.identifier) {
            return false;
        }

        if (this.modelType !== connectionString.modelType) {
            return false;
        }

        const activeProvider = this.getActiveProvider();
        const otherActiveProvider = connectionString.getActiveProvider();

        if (activeProvider !== otherActiveProvider) {
            return false;
        }

        return this.compare(connectionString) === AiSettingsCompareDifferences.None;
    }

    /**
     * Checks if the connection uses an encrypted communication channel (HTTPS).
     * @returns true if the connection is encrypted, false otherwise
     */
    public usingEncryptedCommunicationChannel(): boolean {
        const aiConnectorType = this.getActiveProvider();

        switch (aiConnectorType) {
            case "Ollama":
                return this.ollamaSettings?.uri?.startsWith("https") ?? false;
            case "OpenAi":
                return this.openAiSettings?.endpoint?.startsWith("https") ?? false;
            case "AzureOpenAi":
                return this.azureOpenAiSettings?.endpoint?.startsWith("https") ?? false;
            case "MistralAi":
                return this.mistralAiSettings?.endpoint?.startsWith("https") ?? false;
            case "HuggingFace":
                // Endpoint is optional for HuggingFace, default endpoint is HTTPS
                return !this.huggingFaceSettings?.endpoint ||
                    this.huggingFaceSettings.endpoint.startsWith("https");
            case "Embedded":
            case "Google":
            case "Vertex":
                return true;
            default:
                throw new Error(`Unknown AI connector type: ${aiConnectorType}`);
        }
    }

    /**
     * Gets the maximum number of concurrent query embedding batches for this connection.
     * @param globalQueryEmbeddingsMaxConcurrentBatches The global default value
     * @returns The connection-specific value, or the global default if not set
     */
    public getQueryEmbeddingsMaxConcurrentBatches(
        globalQueryEmbeddingsMaxConcurrentBatches: number
    ): number {
        const provider = this.getActiveProviderInstance();
        return provider?.embeddingsMaxConcurrentBatches ?? globalQueryEmbeddingsMaxConcurrentBatches;
    }
}
