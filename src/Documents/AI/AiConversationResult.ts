/**
 * Represents the result of a single conversation turn.
 */
export enum AiConversationResult {
    /**
     * The conversation has completed and a final answer is available.
     */
    Done = "Done",

    /**
     * Further interaction is required, such as responding to tool requests.
     */
    ActionRequired = "ActionRequired"
}
