import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import { StringUtil } from "../../../../../Utility/StringUtil.js";

/**
 * The configuration for the Ollama API client.
 */
export class OllamaSettings extends AbstractAiSettings {
    /**
     * The URI of the Ollama API.
     */
    public uri: string;

    /**
     * The model that should be used.
     */
    public model: string;

    /**
     * Controls whether thinking models engage their reasoning process before responding.
     * When true, thinking models will perform their internal reasoning process (uses more tokens, slower, better quality for complex tasks).
     * When false, thinking models skip the reasoning process and respond directly (fewer tokens, faster, may reduce quality for complex reasoning).
     * When undefined, the parameter is not sent (backwards compatible).
     * Disable thinking for speed/efficiency in simple tasks, enable for complex tasks requiring reasoning.
     */
    public think?: boolean;

    /**
     * Controls randomness of the model output. Range typically [0.0, 2.0].
     * Higher values (e.g., 1.0+) make output more creative and diverse; lower values (e.g., 0.2) make it more deterministic.
     * When undefined, the parameter is not sent.
     */
    public temperature?: number;

    public constructor(uri: string, model: string) {
        super();
        this.uri = uri;
        this.model = model;
    }

    public validate(errors: string[]): void {
        if (StringUtil.isNullOrWhitespace(this.uri)) {
            errors.push("Value of 'uri' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.model)) {
            errors.push("Value of 'model' field cannot be empty.");
        }

        if (this.temperature !== undefined && this.temperature < 0) {
            errors.push("Value of 'temperature' field must be non-negative.");
        }
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof OllamaSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = AiSettingsCompareDifferences.None;

        if (this.model !== other.model) {
            differences |= AiSettingsCompareDifferences.ModelArchitecture;
        }

        if (this.uri !== other.uri) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        if (this.think !== other.think) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
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
