import type { AiConversationResult } from "./AiConversationResult.js";

export interface AiAnswer<TAnswer> {
    answer?: TAnswer;
    status: AiConversationResult;
}
