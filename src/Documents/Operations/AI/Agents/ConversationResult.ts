import type { AiAgentActionRequest } from "./AiAgentActionRequest.js";
import type { AiUsage } from "./AiUsage.js";

export interface ConversationResult<TAnswer> {
    conversationId: string;
    changeVector: string;
    response: TAnswer;
    totalUsage: AiUsage;

    /**
     * Token usage for this specific turn (not cumulative).
     */
    usage?: AiUsage;

    /**
     * Time elapsed for this specific turn in milliseconds.
     */
    elapsed?: number;

    actionRequests?: AiAgentActionRequest[];
}
