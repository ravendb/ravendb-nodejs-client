import type { AiConversation } from "./AiConversation.js";
import type { AiAgentActionRequest } from "./Agents/AiAgentActionRequest.js";

export interface UnhandledActionEventArgs {
    sender: AiConversation;
    action: AiAgentActionRequest;
}
