import type { AiAgentToolQueryOptions } from "./AiAgentToolQueryOptions.js";

export interface AiAgentToolQuery {
    name: string;
    description: string;
    /**
     * The actual query string (RQL) that represents this tool.
     * This query will be executed by the database when the model requests this tool.
     */
    query: string;
    parametersSampleObject?: string; // JSON example of parameters
    parametersSchema?: string; // JSON schema for parameters
    /**
     * Sends parametersSchema in strict mode; it must follow the provider's strict rules.
     * A schema built from parametersSampleObject is always strict.
     */
    strict?: boolean;
    options?: AiAgentToolQueryOptions;
}
