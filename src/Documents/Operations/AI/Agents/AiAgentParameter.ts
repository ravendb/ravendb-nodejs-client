/**
 * Controls how a parameter behaves, especially across parent and sub-agent boundaries.
 */
export type AiAgentParameterPolicy = "Default" | "ForbidModelGeneration";

/**
 * Defines the expected JSON value type of an agent parameter.
 * "Default" disables type validation (backward compatibility).
 */
export type AiAgentParameterValueType =
    | "Default"
    | "String"
    | "Number"
    | "Boolean"
    | "ArrayOfString"
    | "ArrayOfNumber"
    | "ArrayOfBoolean"
    | "Null";

/**
 * Represents a parameter that can be passed to an AI agent.
 * Parameters can be marked as hidden from the model for security/privacy purposes.
 */
export interface AiAgentParameter {
    name: string;
    description?: string;

    /**
     * Controls whether the parameter value should be sent to the LLM.
     *
     * - `false`: The parameter is hidden from the model (not included in prompts/echo messages).
     *   Use this for sensitive values like userId, tenantId, companyId, etc.
     * - `true`: The parameter is explicitly exposed to the model.
     * - `undefined` (default): Treated as exposed to the model.
     */
    sendToModel?: boolean;

    /**
     * Defines policy flags that control how a parameter behaves when used across
     * parent and sub-agent boundaries.
     * When set to "ForbidModelGeneration" and this agent is used as a sub-agent,
     * the parent agent cannot generate a value for this parameter; the value may
     * only be inherited from the parent agent's parameters.
     */
    policy?: AiAgentParameterPolicy;

    /**
     * Specifies the expected JSON value type for this parameter.
     * When set to a specific value, the agent validates the provided value against it.
     * "Default" disables type validation (backward compatible).
     */
    type?: AiAgentParameterValueType;
}
