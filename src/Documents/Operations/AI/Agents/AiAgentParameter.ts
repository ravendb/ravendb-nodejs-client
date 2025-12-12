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
}