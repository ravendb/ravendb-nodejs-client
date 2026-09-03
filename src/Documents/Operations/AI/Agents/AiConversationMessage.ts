import type { AiUsage } from "./AiUsage.js";

export type AiMessageRole = "System" | "User" | "Assistant" | "Summary" | "Internal";

export interface AiToolCallResult {
    id: string;
    name: string;
    /**
     * Arguments the model passed, as a JSON string.
     */
    arguments: string;
    /**
     * The tool's response content; null while the response is pending.
     */
    result?: string;
    /**
     * For a sub-agent invocation: the ID of the spawned sub-conversation.
     */
    subConversationId?: string;
}

export interface AiConversationMessage {
    role: AiMessageRole;
    content?: string;
    /**
     * When this message was recorded. Unique and monotonic within a conversation;
     * safe to use as a paging cursor.
     */
    timestamp: Date;
    usage?: AiUsage;
    subConversationId?: string;
    /**
     * Revive as [] when the wire carries null or omits the key; never null on a read-back.
     */
    attachments?: string[];
    /**
     * Revive as [] when the wire carries null or omits the key; never null on a read-back.
     */
    toolCalls?: AiToolCallResult[];
}
