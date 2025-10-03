/**
 * Options for controlling when and how query tools are executed in AI agent conversations.
 */
export interface AiAgentToolQueryOptions {
    /**
     * When true, the model is allowed to execute this query on demand based on its own judgment.
     * When false, the model cannot call this query (unless executed as part of initial context).
     * When null/undefined, server-side defaults apply.
     */
    allowModelQueries?: boolean;

    /**
     * When true, the query will be executed during the initial context build and its results provided to the model.
     * When false, the query will not be executed for the initial context.
     * When null/undefined, server-side defaults apply.
     *
     * Notes:
     * - The query must not require model-supplied parameters (it may use agent-scope parameters).
     * - If only addToInitialContext is true and allowModelQueries is false, the query runs only
     *   during the initial context and is not callable by the model afterward.
     * - If both addToInitialContext and allowModelQueries are true, the query will run during
     *   the initial context and may also be invoked later by the model (e.g., to fetch fresh data).
     */
    addToInitialContext?: boolean;
}
