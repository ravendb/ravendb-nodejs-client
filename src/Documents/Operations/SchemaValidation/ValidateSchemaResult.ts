import { IOperationProgress } from "../IOperationProgress.js";
import { IOperationResult } from "../IOperationResult.js";

export interface ValidateSchemaProgress extends IOperationProgress {
    errorCount: number;
    validatedCount: number;
}

export interface ValidateSchemaResult extends ValidateSchemaProgress, IOperationResult {
    /** Error messages keyed by document id. */
    errors: Record<string, string>;
    lastEtag: number;
}
