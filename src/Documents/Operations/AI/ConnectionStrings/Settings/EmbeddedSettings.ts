import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";

/**
 * Configuration for the embedded ONNX model.
 * This uses a server-wide, singleton ONNX service and cannot be configured intentionally.
 */
export class EmbeddedSettings extends AbstractAiSettings {
    /**
     * Compares this settings instance with another to detect differences.
     * @param other The other settings instance to compare with
     * @returns None if both are EmbeddedSettings, All otherwise
     */
    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        return other instanceof EmbeddedSettings
            ? AiSettingsCompareDifferences.None
            : AiSettingsCompareDifferences.All;
    }
}

