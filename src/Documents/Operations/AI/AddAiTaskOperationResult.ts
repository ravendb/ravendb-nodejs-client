/**
 * Base result type for AI task "add" operations.
 * Extends AddEtlOperationResult with an identifier field specific to AI tasks.
 */
export interface AddAiTaskOperationResult {
    /**
     * The Raft command index for the operation.
     */
    raftCommandIndex: number;

    /**
     * The unique task ID assigned by the server.
     */
    taskId: number;

    /**
     * The unique normalized identifier for the AI task.
     */
    identifier: string;
}

/**
 * Result returned when adding a GenAI ETL task.
 */
export interface AddGenAiOperationResult extends AddAiTaskOperationResult {
    // Inherits all properties from AddAiTaskOperationResult
}