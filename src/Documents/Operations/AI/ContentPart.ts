export type ContentPartType = "text";

/**
 * Represents a part of a multi-part prompt that can be sent to an AI agent.
 * This abstract base class enables extensibility for different content types
 * (e.g., text, images, files) in future versions.
 */
export abstract class ContentPart {
    /**
     * The type of this content part
     */
    public readonly type: ContentPartType;

    protected constructor(type: ContentPartType) {
        this.type = type;
    }
}

/**
 * Represents a text-based content part of a prompt.
 * This is the primary content type for sending textual prompts to AI agents.
 *
 * @example
 * ```typescript
 * const textPart = new TextPart("What is the weather today?");
 * conversation.addUserPrompt(textPart.text);
 * ```
 */
export class TextPart extends ContentPart {
    constructor(public text: string) {
        super("text");
    }
}

