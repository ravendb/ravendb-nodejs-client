import { RevisionsOperationContinuationParameters } from "./RevisionsOperationContinuationParameters.js";

export interface RevisionsOperationParameters {
    /**
     * Collections the operation applies to. All collections when empty.
     */
    collections?: string[];
    /**
     * Continuation state from a previous run, to resume where it left off.
     */
    continuationParameters?: RevisionsOperationContinuationParameters;
}
