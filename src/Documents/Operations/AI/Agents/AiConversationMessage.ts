import type { AiUsage } from "./AiUsage.js";

/**
 * The role of a conversation message sender.
 */
export type AiMessageRole =
    "System"
    | "User"
    | "Assistant"
    | "Summary"
    | "Internal";

/**
 * A tool call initiated by an assistant message, with its response inlined.
 */
export interface AiToolCallResult {
    /**
     * The tool call ID from the model.
     */
    id: string;

    /**
     * Tool name.
     */
    name: string;

    /**
     * Arguments the model passed, as JSON string.
     */
    arguments: string;

    /**
     * The tool's response content. Null if still pending (ActionRequired).
     */
    result: string;

    /**
     * If this tool call was a sub-agent invocation, the ID of the spawned sub-conversation.
     * Can be queried separately via getConversationMessages().
     */
    subConversationId: string;
}

/**
 * One message of an AI agent conversation, as returned by getConversationMessages().
 */
export interface AiConversationMessage {
    /**
     * The role of the message sender.
     */
    role: AiMessageRole;

    /**
     * Text content. When the stored message has multiple text parts, they are
     * joined with line breaks. Null for assistant messages that only initiated tool calls.
     */
    content: string;

    /**
     * Attachment file names associated with this message, if any.
     */
    attachments: string[];

    /**
     * When this message was recorded (UTC). Guaranteed unique and monotonic
     * within a conversation, safe to use as a paging cursor.
     */
    timestamp: Date;

    /**
     * Tool calls initiated by this assistant message, with their responses inlined.
     * Empty when no tool calls are present (including for non-assistant messages).
     */
    toolCalls: AiToolCallResult[];

    /**
     * Token usage for this message (typically on assistant messages).
     */
    usage: AiUsage;

    /**
     * For Internal role messages: the ID of the sub-conversation this message relates to.
     */
    subConversationId: string;
}
