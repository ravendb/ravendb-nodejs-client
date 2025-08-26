import type { AiAgentActionRequest } from "./AiAgentActionRequest.js";
import type { AiUsage } from "./AiUsage.js";

export interface ConversationResult<TAnswer> {
    conversationId: string;
    changeVector: string;
    response: TAnswer;
    totalUsage: AiUsage;
    actionRequests?: AiAgentActionRequest[];
}
