import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import { StringUtil } from "../../../../../Utility/StringUtil.js";

/**
 * Represents the version of the Google AI API.
 */
export type GoogleAIVersion =
    | "V1"
    | "V1_Beta";

/**
 * Settings for Google AI service.
 */
export class GoogleSettings extends AbstractAiSettings {
    /**
     * The model that should be used.
     */
    public model: string;

    /**
     * The API key to use to authenticate with the service.
     */
    public apiKey: string;

    /**
     * The version of Google AI to use.
     */
    public aiVersion?: GoogleAIVersion;

    /**
     * The number of dimensions that the model should use.
     */
    public dimensions?: number;

    public constructor(
        model: string,
        apiKey: string,
        aiVersion?: GoogleAIVersion,
        dimensions?: number
    ) {
        super();
        this.model = model;
        this.apiKey = apiKey;
        this.aiVersion = aiVersion;
        this.dimensions = dimensions;
    }

    public validate(errors: string[]): void {
        if (StringUtil.isNullOrWhitespace(this.model)) {
            errors.push("Value of 'model' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.apiKey)) {
            errors.push("Value of 'apiKey' field cannot be empty.");
        }

        if (this.dimensions !== undefined && this.dimensions <= 0) {
            errors.push("Value of 'dimensions' field must be positive.");
        }
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof GoogleSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = AiSettingsCompareDifferences.None;

        if (this.model !== other.model || this.aiVersion !== other.aiVersion) {
            differences |= AiSettingsCompareDifferences.ModelArchitecture;
        }

        if (this.apiKey !== other.apiKey) {
            differences |= AiSettingsCompareDifferences.AuthenticationSettings;
        }

        if (this.dimensions !== other.dimensions) {
            differences |= AiSettingsCompareDifferences.EmbeddingDimensions;
        }

        return differences;
    }
}
