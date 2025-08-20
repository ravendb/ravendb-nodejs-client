export interface AiAgentActionRequest {
    name: string;
    toolId: string;
    arguments: string; // JSON string provided by the model
}