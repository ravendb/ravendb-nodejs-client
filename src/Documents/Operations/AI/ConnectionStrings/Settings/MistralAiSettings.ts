import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import { StringUtil } from "../../../../../Utility/StringUtil.js";

/**
 * Settings for Mistral AI service.
 */
export class MistralAiSettings extends AbstractAiSettings {
    /**
     * The model ID for the Mistral AI service.
     */
    public model: string;

    /**
     * The endpoint for the Mistral AI service.
     */
    public endpoint: string;

    /**
     * The API key required for accessing the Mistral AI service.
     */
    public apiKey: string;

    public constructor(model: string, apiKey: string, endpoint: string) {
        super();
        this.model = model;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
    }

    public validate(errors: string[]): void {
        if (StringUtil.isNullOrWhitespace(this.model)) {
            errors.push("Value of 'model' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.endpoint)) {
            errors.push("Value of 'endpoint' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.apiKey)) {
            errors.push("Value of 'apiKey' field cannot be empty.");
        }
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof MistralAiSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = AiSettingsCompareDifferences.None;

        if (this.model !== other.model) {
            differences |= AiSettingsCompareDifferences.ModelArchitecture;
        }

        if (this.endpoint !== other.endpoint) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        if (this.apiKey !== other.apiKey) {
            differences |= AiSettingsCompareDifferences.AuthenticationSettings;
        }

        return differences;
    }
}
