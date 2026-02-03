import type { AiAgentToolQuery } from "../AiAgentToolQuery.js";
import type { AiAgentToolAction } from "../AiAgentToolAction.js";
import type { AiAgentParameter } from "../AiAgentParameter.js";
import type { AiAgentChatTrimmingConfiguration } from "./AiAgentChatTrimmingConfiguration.js";

export interface AiAgentConfiguration {
    identifier?: string;
    name: string;
    connectionStringName: string;
    systemPrompt: string;
    disabled?: boolean;
    sampleObject: string; // JSON string sample for output
    outputSchema?: string; // JSON schema for output
    queries?: AiAgentToolQuery[];
    actions?: AiAgentToolAction[];
    parameters?: AiAgentParameter[];
    chatTrimming?: AiAgentChatTrimmingConfiguration;
    maxModelIterationsPerCall?: number;
}
