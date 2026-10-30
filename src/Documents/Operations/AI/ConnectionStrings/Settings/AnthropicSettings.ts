import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { IAiSettings } from "./IAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import { StringUtil } from "../../../../../Utility/StringUtil.js";
import { LiteralUnion } from "../../../../../Types/index.js";

export type AnthropicReasoningEffort = LiteralUnion<"low" | "medium" | "high" | "xhigh" | "max">;

const DEFAULT_ENDPOINT = "https://api.anthropic.com/v1/";

// The documented base URL has no version segment; the Messages API is served under v1/.
const ANTHROPIC_BASE_URI = "https://api.anthropic.com/";

/**
 * Settings for Anthropic's native Claude API (the Messages API). Chat model type only.
 */
export class AnthropicSettings extends AbstractAiSettings implements IAiSettings {
    /**
     * The Anthropic API key (sent as the x-api-key header).
     */
    public apiKey: string;

    /**
     * The Claude model id.
     */
    public model: string;

    /**
     * The API endpoint. Optional, defaults to "https://api.anthropic.com/v1/".
     */
    public endpoint?: string;

    /**
     * The output-token cap per request (required by the Messages API).
     * When not set, the server applies a default of 16000.
     */
    public maxOutputTokens?: number;

    /**
     * How much reasoning the model should do before answering. When not set, no reasoning configuration is sent
     * and the model applies its own default.
     *
     * The levels are "low", "medium", "high", "xhigh" and "max"; not every model supports
     * all of them, and a model without effort support rejects the request. The value is trimmed and sent in lowercase
     * without further validation, so a new provider value can be used without waiting for a RavenDB release.
     */
    public reasoningEffort?: AnthropicReasoningEffort;

    /**
     * Enables prompt caching for AI agents and GenAI tasks. Anthropic bills a cache write above the normal input price and a
     * cache read well below it, so caching pays off only when the same prompt is sent again within the cache lifetime: the turns
     * of an agent conversation, or a GenAI task whose query tools the model calls. A GenAI task without query tools sends each
     * document once, so caching would only add the write cost.
     * When not set, caching is enabled for AI agents and for GenAI tasks with query tools, and disabled for other GenAI tasks.
     */
    public enablePromptCache?: boolean;

    /**
     * The Anthropic API version, sent as the anthropic-version header. Optional, defaults to "2023-06-01".
     */
    public apiVersion?: string;

    public constructor(
        apiKey: string,
        model: string,
        endpoint?: string,
        maxOutputTokens?: number,
        reasoningEffort?: AnthropicReasoningEffort
    ) {
        super();
        this.apiKey = apiKey;
        this.model = model;
        this.endpoint = endpoint;
        this.maxOutputTokens = maxOutputTokens;
        this.reasoningEffort = reasoningEffort;
    }

    public getBaseEndpointUri(): string {
        let endpoint = StringUtil.isNullOrWhitespace(this.endpoint) ? DEFAULT_ENDPOINT : this.endpoint;
        if (!endpoint.endsWith("/")) {
            endpoint += "/";
        }

        const uri = new URL(endpoint).href;
        return uri === ANTHROPIC_BASE_URI ? new URL("v1/", uri).href : uri;
    }

    public validate(errors: string[]): void {
        if (StringUtil.isNullOrWhitespace(this.apiKey)) {
            errors.push("Value of 'apiKey' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.model)) {
            errors.push("Value of 'model' field cannot be empty.");
        }

        if (this.maxOutputTokens != null && this.maxOutputTokens <= 0) {
            errors.push("Value of 'maxOutputTokens' field must be positive.");
        }
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof AnthropicSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = AiSettingsCompareDifferences.None;

        if (this.apiKey !== other.apiKey) {
            differences |= AiSettingsCompareDifferences.AuthenticationSettings;
        }

        if (this.model !== other.model) {
            differences |= AiSettingsCompareDifferences.ModelArchitecture;
        }

        if (this.endpoint !== other.endpoint) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        if (this.maxOutputTokens !== other.maxOutputTokens) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        if (this.reasoningEffort !== other.reasoningEffort) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        if (this.enablePromptCache !== other.enablePromptCache) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        if (this.apiVersion !== other.apiVersion) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        return differences;
    }
}
