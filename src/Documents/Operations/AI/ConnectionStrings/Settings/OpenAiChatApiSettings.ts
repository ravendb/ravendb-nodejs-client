import { OpenAiBaseSettings } from "./OpenAiBaseSettings.js";
import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import type { OpenAiReasoningEffort } from "./OpenAiSettings.js";

/**
 * The API that chat requests are sent to:
 * - "Responses": the /responses API.
 * - "ChatCompletions": the /chat/completions API.
 */
export type OpenAiChatApiType = "Responses" | "ChatCompletions";

/**
 * Base settings for the connectors whose chat requests can go to either OpenAI chat API: OpenAI and Azure OpenAI.
 * Ollama has the same chatApi and reasoningEffort fields on OllamaSettings.
 */
export abstract class OpenAiChatApiSettings extends OpenAiBaseSettings {
    /**
     * The API that chat requests are sent to. When not set, the connector's default is used:
     * - OpenAI: "Responses" for an empty endpoint or api.openai.com, "ChatCompletions" for any other endpoint.
     * - Azure OpenAI: "Responses".
     */
    public chatApi?: OpenAiChatApiType;

    /**
     * Controls the reasoning depth used by supported models (e.g. GPT-5 family).
     * Lower values reduce internal reasoning, improving latency.
     *
     * Typical values are "none", "minimal", "low", "medium", "high", "xhigh" and "max". Model families accept
     * different subsets. When not set, the model applies its own default.
     *
     * Sent to the provider as supplied (trimmed) and not validated by RavenDB, so new provider values can be used
     * without a client update. OpenAI accepts lowercase values only. Legacy names ("Minimal", "Low", "Medium",
     * "High") are normalized by the server.
     */
    public reasoningEffort?: OpenAiReasoningEffort;

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof OpenAiChatApiSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = super.compare(other);

        if (this.chatApi !== other.chatApi ||
            this.reasoningEffort !== other.reasoningEffort) {
            differences |= AiSettingsCompareDifferences.EndpointConfiguration;
        }

        return differences;
    }
}
