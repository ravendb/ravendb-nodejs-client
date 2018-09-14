
export interface MoreLikeThisOptions {
    minimumTermFrequency?: number;
    maximumQueryTerms?: number;
    maximumNumberOfTokensParsed?: number;
    minimumWordLength?: number;
    maximumWordLength?: number;
    minimumDocumentFrequency?: number;
    maximumDocumentFrequency?: number;
    maximumDocumentFrequencyPercentage?: number;
    boost?: boolean;
    boostFactor?: number;
    stopWordsDocumentId?: string;
    fields?: string[];
}
