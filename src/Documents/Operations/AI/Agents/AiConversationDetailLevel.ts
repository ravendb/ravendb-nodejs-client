/**
 * Controls the level of detail when reading conversation messages.
 *
 * - "Simple": user messages and assistant messages that have content only.
 *   System prompts, tool calls, summaries, and internal messages are excluded.
 * - "Detailed": includes system messages, tool calls with results, and per-message usage.
 *   Summaries and internal messages are excluded.
 * - "Full": no filtering. Includes all messages: system, tool calls, summaries, internal.
 *   Intended for debugging and future-proofing.
 */
export type AiConversationDetailLevel =
    "Simple"
    | "Detailed"
    | "Full";
