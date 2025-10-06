import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";

/**
 * Settings for embedded AI models (placeholder for future implementation).
 */
export class EmbeddedSettings extends AbstractAiSettings {
    public validate(errors: string[]): void {
        // nothing to validate.
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (other instanceof EmbeddedSettings) {
            return AiSettingsCompareDifferences.None;
        }

        return AiSettingsCompareDifferences.All;
    }
}
