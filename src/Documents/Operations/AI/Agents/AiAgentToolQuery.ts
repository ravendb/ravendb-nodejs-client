import type { AiAgentToolQueryOptions } from "./AiAgentToolQueryOptions.js";

export interface AiAgentToolQuery {
    name: string;
    description: string;
    query: string;
    parametersSampleObject?: string; // JSON example of parameters
    parametersSchema?: string; // JSON schema for parameters
    options?: AiAgentToolQueryOptions;
}
