import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";

/**
 * Base class for all AI provider settings.
 */
export abstract class AbstractAiSettings {
    /**
     * Maximum number of concurrent embedding batches for each embeddings generation task that uses this
     * connection string. RavenDB can run up to this number of source-document batches and up to the same
     * number of search-term batches at the same time.
     * Overrides the server or database default set by `Ai.Embeddings.MaxConcurrentBatches`.
     */
    public embeddingsMaxConcurrentBatches?: number;

    /**
     * Validates the settings fields and adds any errors to the provided array.
     * Provider-specific settings extend this validation and must call `super.validate(errors)`.
     * @param errors Array to collect validation error messages
     */
    public validate(errors: string[]): void {
        if (this.embeddingsMaxConcurrentBatches != null && this.embeddingsMaxConcurrentBatches <= 0) {
            errors.push("Value of 'embeddingsMaxConcurrentBatches' field must be a positive number.");
        }
    }

    /**
     * Compares this settings instance with another to detect differences.
     * @param other The other settings instance to compare with
     * @returns Flags indicating which settings differ
     */
    public abstract compare(other: AbstractAiSettings): AiSettingsCompareDifferences;
}
