import { IRavenObject } from "../../../../Types/IRavenObject.js";

/**
 * Defines configuration options for reducing the size of the AI agent's chat history.
 */
export class AiAgentChatTrimmingConfiguration implements IRavenObject {
    public constructor(tokensConfig?: AiAgentSummarizationByTokens, historyConfig?: AiAgentHistoryConfiguration);
    public constructor(truncateConfig?: AiAgentTruncateChat, historyConfig?: AiAgentHistoryConfiguration);
    public constructor(configOrTruncate?: AiAgentSummarizationByTokens | AiAgentTruncateChat, historyConfig?: AiAgentHistoryConfiguration) {
        if (configOrTruncate) {
            if (configOrTruncate instanceof AiAgentSummarizationByTokens) {
                this.tokens = configOrTruncate;
            } else if (configOrTruncate instanceof AiAgentTruncateChat) {
                this.truncate = configOrTruncate;
            }
        }
        if (historyConfig) {
            this.history = historyConfig;
        }
    }

    public tokens: AiAgentSummarizationByTokens | null;
    public truncate: AiAgentTruncateChat | null;
    public history: AiAgentHistoryConfiguration | null;
}

/**
 * Configuration settings for AI agent conversation summarization.
 */
export class AiAgentSummarizationByTokens implements IRavenObject {
    private static readonly DEFAULT_MAX_TOKENS_BEFORE_SUMMARIZATION = 32 * 1024;

    public summarizationTaskBeginningPrompt: string;
    public summarizationTaskEndPrompt: string;
    public resultPrefix: string;
    public maxTokensBeforeSummarization: number = AiAgentSummarizationByTokens.DEFAULT_MAX_TOKENS_BEFORE_SUMMARIZATION;
    public maxTokensAfterSummarization: number = 1024;
}

/**
 * Configuration for truncating the AI chat history based on message count.
 */
export class AiAgentTruncateChat implements IRavenObject {
    private static readonly DEFAULT_MESSAGES_LENGTH_BEFORE_TRUNCATE = 500;

    public messagesLengthBeforeTruncate: number = AiAgentTruncateChat.DEFAULT_MESSAGES_LENGTH_BEFORE_TRUNCATE;
    public messagesLengthAfterTruncate: number = AiAgentTruncateChat.DEFAULT_MESSAGES_LENGTH_BEFORE_TRUNCATE / 2;
}

/**
 * Defines the configuration for retention and expiration of AI agent chat history documents.
 */
export class AiAgentHistoryConfiguration implements IRavenObject {
    public historyExpirationInSec: number;
}
