export interface AiAgentChatTrimmingConfiguration {
    tokens?: AiAgentSummarizationByTokens;
    // Note: truncate is internal in C#, we keep it optional for completeness
    truncate?: AiAgentTruncateChat;
    history?: AiAgentHistoryConfiguration;
}

export interface AiAgentSummarizationByTokens {
    summarizationTaskBeginningPrompt?: string;
    summarizationTaskEndPrompt?: string;
    resultPrefix?: string;
    maxTokensBeforeSummarization?: number;
    maxTokensAfterSummarization?: number;
}

export interface AiAgentTruncateChat {
    messagesLengthBeforeTruncate?: number; // default 500 in C#
    messagesLengthAfterTruncate?: number;  // default 250 in C#
}

export interface AiAgentHistoryConfiguration {
    historyExpirationInSec?: number;
}
