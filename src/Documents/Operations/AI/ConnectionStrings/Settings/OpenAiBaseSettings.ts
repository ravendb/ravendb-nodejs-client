import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { IAiSettings } from "./IAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import { StringUtil } from "../../../../../Utility/StringUtil.js";

/**
 * Base settings for OpenAI-compatible providers.
 */
export abstract class OpenAiBaseSettings extends AbstractAiSettings implements IAiSettings {
    /**
     * The API key to use to authenticate with the service.
     */
    public apiKey: string;

    /**
     * The service endpoint that the client will send requests to.
     */
    public endpoint: string;

    /**
     * The model that should be used.
     */
    public model: string;

    /**
     * The number of dimensions that the model should use.
     */
    public dimensions?: number;

    /**
     * Controls randomness of the model output. Range typically [0.0, 2.0].
     * Higher values (e.g., 1.0+) make output more creative and diverse;
     * lower values (e.g., 0.2) make it more deterministic.
     * When undefined, the parameter is not sent.
     */
    public temperature?: number;

    protected constructor(
        apiKey: string,
        endpoint: string,
        model: string,
        dimensions?: number,
        temperature?: number
    ) {
        super();
        this.apiKey = apiKey;
        this.endpoint = endpoint;
        this.model = model;
        this.dimensions = dimensions;
        this.temperature = temperature;
    }

    public getBaseEndpointUri(): string {
        let endpoint = this.endpoint;
        if (!endpoint.endsWith("/")) {
            endpoint += "/";
        }
        return endpoint;
    }

    public validate(errors: string[]): void {
        if (StringUtil.isNullOrWhitespace(this.apiKey)) {
            errors.push("Value of 'apiKey' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.endpoint)) {
            errors.push("Value of 'endpoint' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.model)) {
            errors.push("Value of 'model' field cannot be empty.");
        }

        if (this.dimensions !== undefined && this.dimensions <= 0) {
            errors.push("Value of 'dimensions' field must be positive.");
        }

        if (this.temperature !== undefined && this.temperature < 0) {
            errors.push("Value of 'temperature' field must be non-negative.");
        }
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof OpenAiBaseSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = AiSettingsCompareDifferences.None;

        if (this.apiKey !== other.apiKey) {
            differences |= AiSettingsCompareDifferences.AuthenticationSettings;
        }

        if (this.endpoint !== other.endpoint) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        if (this.model !== other.model) {
            differences |= AiSettingsCompareDifferences.ModelArchitecture;
        }

        if (this.dimensions !== other.dimensions) {
            differences |= AiSettingsCompareDifferences.EmbeddingDimensions;
        }

        const hasTemperature = this.temperature !== undefined;
        const otherHasTemperature = other.temperature !== undefined;

        if (hasTemperature !== otherHasTemperature ||
            (hasTemperature && otherHasTemperature &&
             Math.abs(this.temperature! - other.temperature!) > 0.0001)) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        return differences;
    }
}
