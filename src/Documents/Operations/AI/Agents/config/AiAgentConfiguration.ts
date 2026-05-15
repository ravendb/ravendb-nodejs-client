import type { AiAgentToolQuery } from "../AiAgentToolQuery.js";
import type { AiAgentToolAction } from "../AiAgentToolAction.js";
import type { AiAgentToolSubAgent } from "../AiAgentToolSubAgent.js";
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
    /**
     * Server-side sub-agents the model can call as tools.
     * Sub-agents are managed entirely by the server and inherit parameters from the root agent.
     *
     * Client-side action handlers can be registered for sub-agent actions using the path syntax:
     * `handle("sub-agent-id/ActionName", ...)` or `handle("parent/child/ActionName", ...)`
     */
    subAgents?: AiAgentToolSubAgent[];
    parameters?: AiAgentParameter[];
    chatTrimming?: AiAgentChatTrimmingConfiguration;
    maxModelIterationsPerCall?: number;
}
