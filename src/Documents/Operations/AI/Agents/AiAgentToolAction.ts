export interface AiAgentToolAction {
    name: string;
    description: string;
    parametersSampleObject?: string; // JSON string example
    parametersSchema?: string; // JSON schema string
}