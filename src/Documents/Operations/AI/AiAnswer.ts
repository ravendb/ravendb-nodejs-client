import type { AiConversationResult } from "./AiConversationResult.js";
import type { AiUsage } from "./Agents/AiUsage.js";

export interface AiAnswer<TAnswer> {
    answer?: TAnswer;
    status: AiConversationResult;

    /**
     * Token usage reported by the model for generating this answer (prompt/completion/total).
     * This reflects usage for the current turn only.
     */
    usage?: AiUsage;

    /**
     * The total time elapsed to produce the answer (measured from the server's request to the LLM until the response was received).
     * Expressed in milliseconds.
     */
    elapsed?: number;
}
