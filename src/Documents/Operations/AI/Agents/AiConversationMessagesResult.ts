import type { AiUsage } from "./AiUsage.js";
import type { AiConversationMessage } from "./AiConversationMessage.js";

export interface AiConversationMessagesResult {
    conversationId: string;
    agent: string;
    /**
     * Name -> value map taken verbatim from the wire; null when the conversation has none.
     */
    parameters?: { [key: string]: unknown };
    totalUsage?: AiUsage;
    lastMessageAt: Date;
    hasMoreMessages: boolean;
    /**
     * Revive as [] when the wire carries null or omits the key; never null on a read-back.
     */
    subConversationIds?: string[];
    /**
     * Revive as [] when the wire carries null or omits the key; never null on a read-back.
     */
    attachments?: string[];
    /**
     * Messages in chronological order (oldest first); never null on a read-back.
     */
    messages: AiConversationMessage[];
}
