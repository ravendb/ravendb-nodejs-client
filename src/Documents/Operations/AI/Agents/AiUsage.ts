/**
 * Represents token usage metrics from an AI model.
 * Includes support for reasoning tokens (o1/o3 models) and per-turn usage calculation.
 */
export class AiUsage {
    public promptTokens: number = 0;
    public completionTokens: number = 0;
    public totalTokens: number = 0;
    public cachedTokens: number = 0;
    /**
     * Reasoning tokens used by models like o1/o3.
     * These tokens represent the model's internal reasoning process.
     */
    public reasoningTokens: number = 0;

    /**
     * Calculate the usage difference between the current turn and the previous cumulative usage.
     * This is used to extract per-turn metrics from cumulative totals.
     */
    public static getUsageDifference(current: AiUsage, previous: AiUsage): AiUsage {
        if (!current) {
            throw new Error("current usage cannot be null");
        }
        if (!previous) {
            throw new Error("previous usage cannot be null");
        }

        const previousTotalWithoutReasoning =
            (previous.completionTokens - previous.reasoningTokens) + previous.promptTokens;

        const result = new AiUsage();

        result.promptTokens = Math.max(current.promptTokens - previousTotalWithoutReasoning, 0);
        result.totalTokens = Math.max(current.totalTokens - previousTotalWithoutReasoning, 0);

        result.cachedTokens = current.cachedTokens;
        result.completionTokens = current.completionTokens;
        result.reasoningTokens = current.reasoningTokens;

        return result;
    }
}
