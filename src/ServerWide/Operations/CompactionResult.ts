import { IOperationProgress } from "../../Documents/Operations/IOperationProgress.js";
import { IOperationResult } from "../../Documents/Operations/IOperationResult.js";

export interface CompactionProgressBase<T> {
    /** Keyed by index name. */
    indexesResults: Record<string, T>;
    message: string;
    treeName: string;
    treeProgress: number;
    treeTotal: number;
    globalProgress: number;
    globalTotal: number;
    skipped: boolean;
    processed: boolean;
}

export interface CompactionProgress extends CompactionProgressBase<CompactionProgress>, IOperationProgress {
}

export interface CompactionResult extends CompactionProgressBase<CompactionResult>, IOperationResult {
    name: string;
    sizeBeforeCompactionInMb: number;
    sizeAfterCompactionInMb: number;
    messages: string[];
}
