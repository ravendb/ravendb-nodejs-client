export interface AiAgentToolAction {
    name: string;
    description: string;
    parametersSampleObject?: string; // JSON string example
    parametersSchema?: string; // JSON schema string
    /**
     * Sends parametersSchema in strict mode; it must follow the provider's strict rules.
     * A schema built from parametersSampleObject is always strict.
     */
    strict?: boolean;
}