import type { AiConversationMessage } from "./AiConversationMessage.js";
import type { AiUsage } from "./AiUsage.js";

/**
 * The result of fetching conversation messages.
 */
export interface AiConversationMessagesResult {
    /**
     * The conversation document ID.
     */
    conversationId: string;

    /**
     * The identifier of the AI agent this conversation belongs to.
     */
    agent: string;

    /**
     * The conversation parameters as a name -> value map, normalized from the stored format.
     * Keys keep their original (user-provided) casing.
     */
    parameters: Record<string, any>;

    /**
     * Cumulative token usage across all turns of this conversation.
     */
    totalUsage: AiUsage;

    /**
     * When the last message was added to the conversation.
     */
    lastMessageAt: Date;

    /**
     * Messages in chronological order (oldest first).
     */
    messages: AiConversationMessage[];

    /**
     * True if there are more messages beyond the returned page.
     * For backward/default paging: older messages exist.
     * For forward (after) paging: newer messages exist.
     */
    hasMoreMessages: boolean;

    /**
     * IDs of sub-agent conversations spawned during this conversation.
     * Each can be queried separately via getConversationMessages().
     */
    subConversationIds: string[];

    /**
     * All attachments referenced across the conversation.
     */
    attachments: string[];
}
