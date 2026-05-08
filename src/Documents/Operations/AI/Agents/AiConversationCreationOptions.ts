/**
 * Optional configuration for a conversation parameter.
 */
export interface AiConversationParameterOptions {
    /**
     * When false, the parameter is available for internal use (queries, actions, sub-agents)
     * but is not sent to the LLM. Default is true.
     */
    sendToModel?: boolean;
}

/**
 * A typed conversation parameter with a value and visibility control.
 */
export interface AiConversationParameter {
    value: unknown;
    /**
     * Whether this parameter is sent to the model. Default is true.
     */
    sendToModel: boolean;
}

/**
 * Options used when creating or continuing an AI conversation.
 */
export class AiConversationCreationOptions {
    /**
     * Conversation-level parameters passed to the agent.
     * Each parameter defines a value and whether it should be sent to the model.
     */
    parameters?: Record<string, AiConversationParameter>;

    /**
     * Optional conversation expiration in seconds.
     */
    expirationInSec?: number;

    /**
     * Limits the number of model iterations (tool call round-trips) per run() call.
     */
    maxModelIterationsPerCall?: number;

    public constructor();
    public constructor(parameters: Record<string, AiConversationParameter>);
    /**
     * Legacy constructor: accepts a plain Record<string, unknown> and wraps each value
     * as an AiConversationParameter with sendToModel = true.
     *
     * **Note:** If a plain-object value happens to have both a `value` property and a
     * `sendToModel` property, it will be treated as an already-structured
     * `AiConversationParameter` rather than a raw value. Prefer the typed overload or
     * `addParameter()` when parameter values may have this shape.
     */
    public constructor(parameters: Record<string, unknown>);
    public constructor(parameters?: Record<string, AiConversationParameter | unknown>) {
        if (parameters) {
            this.parameters = {};
            for (const [key, val] of Object.entries(parameters)) {
                if (val != null && typeof val === "object" && "value" in val && "sendToModel" in val) {
                    this.parameters[key] = val as AiConversationParameter;
                } else {
                    this.parameters[key] = { value: val, sendToModel: true };
                }
            }
        }
    }

    /**
     * Adds a parameter to the conversation. Fluent builder pattern.
     */
    public addParameter(name: string, value: unknown, options?: AiConversationParameterOptions): this {
        this.parameters ??= {};
        this.parameters[name] = {
            value,
            sendToModel: options?.sendToModel ?? true
        };
        return this;
    }
}
