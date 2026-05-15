import { OpenAiBaseSettings } from "./OpenAiBaseSettings.js";
import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";

/**
 * Controls the amount of internal reasoning the model performs.
 * Lower values reduce latency; higher values improve response quality for complex tasks.
 */
export type OpenAiReasoningEffort = "Minimal" | "Low" | "Medium" | "High";

/**
 * The configuration for the OpenAI API client.
 */
export class OpenAiSettings extends OpenAiBaseSettings {
    /**
     * The value to use for the OpenAI-Organization request header. Users who belong to multiple organizations
     * can set this value to specify which organization is used for an API request. Usage from these API requests will
     * count against the specified organization's quota. If not set, the header will be omitted, and the default
     * organization will be billed. You can change your default organization in your user settings.
     * Learn more: https://platform.openai.com/docs/guides/production-best-practices/setting-up-your-organization
     */
    public organizationId?: string;

    /**
     * The value to use for the OpenAI-Project request header. Users who are accessing their projects through
     * their legacy user API key can set this value to specify which project is used for an API request. Usage from
     * these API requests will count as usage for the specified project. If not set, the header will be omitted, and
     * the default project will be accessed.
     */
    public projectId?: string;

    /**
     * Controls the reasoning depth used by supported models (e.g. GPT-5 family).
     * Lower values reduce internal reasoning, improving latency.
     */
    public reasoningEffort?: OpenAiReasoningEffort;

    /**
     * Optional seed for more reproducible sampling across requests.
     * Does not guarantee fully deterministic results.
     */
    public seed?: number;

    private static readonly OPENAI_BASE_URI = "https://api.openai.com/";

    public constructor(
        apiKey: string,
        endpoint: string,
        model: string,
        organizationId?: string,
        projectId?: string,
        dimensions?: number,
        temperature?: number,
        enablePromptCache?: boolean,
        reasoningEffort?: OpenAiReasoningEffort,
        seed?: number
    ) {
        super(apiKey, endpoint, model, dimensions, temperature, enablePromptCache);
        this.organizationId = organizationId;
        this.projectId = projectId;
        this.reasoningEffort = reasoningEffort;
        this.seed = seed;
    }

    public getBaseEndpointUri(): string {
        const uri = super.getBaseEndpointUri();

        if (uri === OpenAiSettings.OPENAI_BASE_URI) {
            return uri + "v1/";
        }

        return uri;
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof OpenAiSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = super.compare(other);

        if (this.organizationId !== other.organizationId ||
            this.projectId !== other.projectId) {
            differences |= AiSettingsCompareDifferences.AuthenticationSettings;
        }

        if (this.reasoningEffort !== other.reasoningEffort ||
            this.seed !== other.seed) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        return differences;
    }
}
