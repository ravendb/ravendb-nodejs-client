/**
 * Represents a server-side sub-agent that the model can call as a tool.
 * Sub-agents are managed by the server and inherit parameters from the root agent.
 */
export interface AiAgentToolSubAgent {
    /**
     * The identifier of the sub-agent to call (e.g., "attendance-agent").
     */
    identifier: string;

    /**
     * A description the model uses to decide when to invoke this sub-agent.
     */
    description: string;
}
