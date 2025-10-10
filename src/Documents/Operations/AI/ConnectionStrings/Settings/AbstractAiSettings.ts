import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";

/**
 * Base class for all AI provider settings.
 */
export abstract class AbstractAiSettings {
    /**
     * Maximum number of query embedding batches that can be processed concurrently.
     * Allows users to override the database global value.
     */
    public embeddingsMaxConcurrentBatches?: number;

    /**
     * Validates the settings fields and adds any errors to the provided array.
     * @param errors Array to collect validation error messages
     */
    public abstract validate(errors: string[]): void;

    /**
     * Compares this settings instance with another to detect differences.
     * @param other The other settings instance to compare with
     * @returns Flags indicating which settings differ
     */
    public abstract compare(other: AbstractAiSettings): AiSettingsCompareDifferences;
}
