import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import { StringUtil } from "../../../../../Utility/StringUtil.js";

/**
 * Settings for HuggingFace service.
 */
export class HuggingFaceSettings extends AbstractAiSettings {
    /**
     * The name of the Hugging Face model.
     */
    public model: string;

    /**
     * The endpoint for the text embedding generation service. If not specified, the default endpoint will be used.
     */
    public endpoint?: string;

    /**
     * The API key required for accessing the Hugging Face service.
     */
    public apiKey: string;

    public constructor(apiKey: string, model: string, endpoint?: string) {
        super();
        this.model = model;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
    }

    public validate(errors: string[]): void {
        if (StringUtil.isNullOrWhitespace(this.model)) {
            errors.push("Value of 'model' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.apiKey)) {
            errors.push("Value of 'apiKey' field cannot be empty.");
        }
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof HuggingFaceSettings)) {
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
