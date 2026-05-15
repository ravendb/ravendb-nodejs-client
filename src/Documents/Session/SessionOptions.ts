import { RequestExecutor } from "../../Http/RequestExecutor.js";
import { TransactionMode } from "./TransactionMode.js";
import { ShardedBatchBehavior } from "./ShardedBatchBehavior.js";

/**
 * Controls how the session checks for concurrent document modifications.
 *
 * - "None": No checks. PUT/DELETE are sent without a change vector.
 * - "Writes": Change vectors are sent only for modified/deleted documents.
 * - "WritesAndReads": Change vectors are sent for ALL tracked documents
 *   (including unmodified ones).
 */
export type OptimisticConcurrencyMode = "None" | "Writes" | "WritesAndReads";

export interface SessionOptions {
    database?: string;
    requestExecutor?: RequestExecutor;
    noTracking?: boolean;
    noCaching?: boolean;
    transactionMode?: TransactionMode;
    disableAtomicDocumentWritesInClusterWideTransaction?: boolean;
    shardedBatchBehavior?: ShardedBatchBehavior;
    /**
     * Override the optimistic concurrency mode for this session.
     * When omitted, inherits from DocumentConventions.optimisticConcurrencyMode.
     */
    optimisticConcurrencyMode?: OptimisticConcurrencyMode;
}
