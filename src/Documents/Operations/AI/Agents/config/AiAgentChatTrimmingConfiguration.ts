export interface AiAgentChatTrimmingConfiguration {
    tokens?: AiAgentSummarizationByTokens;
    history?: AiAgentHistoryConfiguration;
}

export interface AiAgentSummarizationByTokens {
    summarizationTaskBeginningPrompt?: string;
    summarizationTaskEndPrompt?: string;
    resultPrefix?: string;
    maxTokensBeforeSummarization?: number;
    maxTokensAfterSummarization?: number;
}

export interface AiAgentHistoryConfiguration {
    historyExpirationInSec?: number;
}
