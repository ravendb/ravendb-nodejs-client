export interface AiAgentActionResponse {
    toolId: string;
    content: string; // JSON/string content provided back to the agent
}

export interface AiAgentArtificialActionResponse {
    toolId: string;
    content: string; // JSON string or plain text supplied to the model as an artificial tool result
}
