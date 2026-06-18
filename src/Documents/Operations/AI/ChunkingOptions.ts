/**
 * Methods for splitting text into chunks for embedding generation.
 */
export type ChunkingMethod =
    | "PlainTextSplit"
    | "PlainTextSplitLines"
    | "PlainTextSplitParagraphs"
    | "MarkDownSplitLines"
    | "MarkDownSplitParagraphs"
    | "HtmlStrip";

/**
 * Configuration for chunking text into smaller pieces for embedding generation.
 */
export interface ChunkingOptions {
    /**
     * The method to use for splitting text into chunks.
     */
    chunkingMethod: ChunkingMethod;

    /**
     * Maximum number of tokens per chunk.
     * @default 512
     */
    maxTokensPerChunk: number;

    /**
     * Number of tokens to overlap between consecutive chunks.
     * Only supported for MarkDownSplitParagraphs and PlainTextSplitParagraphs.
     * @default 0
     */
    overlapTokens: number;

    /**
     * Optional constant text prepended to every produced chunk before it is sent to the embedding model.
     * Useful for adding broader document context (e.g. title) to isolated chunks.
     * Its tokens count against maxTokensPerChunk.
     * Must be non-empty if provided.
     */
    contextPrefix?: string;
}

/**
 * Chunking methods that support overlap tokens.
 */
export const METHODS_SUPPORTING_OVERLAP_TOKENS: ChunkingMethod[] = [
    "MarkDownSplitParagraphs",
    "PlainTextSplitParagraphs"
];

/**
 * Validates chunking options and returns an array of error messages.
 * @param options The chunking options to validate
 * @param source The source/context of the validation (e.g., field name) for better error messages
 * @returns Array of validation error messages, empty if valid
 */
export function validateChunkingOptions(source: string, options: ChunkingOptions): string[] {
    const errors: string[] = [];

    if (!options) {
        errors.push(`'${source}': ChunkingOptions must be provided.`);
        return errors;
    }

    if (options.contextPrefix != null && options.contextPrefix.trim() === "") {
        errors.push(`'${source}': contextPrefix cannot be empty or whitespace-only. Either provide a non-empty value or omit it.`);
    }

    if (options.maxTokensPerChunk <= 0) {
        errors.push(`'${source}': maxTokensPerChunk value has to be greater than 0.`);
    }

    if (options.overlapTokens < 0) {
        errors.push(`'${source}': overlapTokens value cannot be negative.`);
    }

    if (options.overlapTokens > options.maxTokensPerChunk) {
        errors.push(`'${source}': overlapTokens cannot be greater than maxTokensPerChunk.`);
    }

    if (options.overlapTokens > 0 && !METHODS_SUPPORTING_OVERLAP_TOKENS.includes(options.chunkingMethod)) {
        const supportedMethods = METHODS_SUPPORTING_OVERLAP_TOKENS.join(", ");
        errors.push(
            `'${source}': overlapTokens option is only supported for the following chunking methods: ${supportedMethods}.`
        );
    }

    return errors;
}

/**
 * Compares two ChunkingOptions for equality.
 * @param left First chunking options to compare
 * @param right Second chunking options to compare
 * @returns true if both are equal or both are null/undefined, false otherwise
 */
export function areChunkingOptionsEqual(
    left: ChunkingOptions,
    right: ChunkingOptions
): boolean {
    if (left == null && right == null) {
        return true;
    }

    if (left == null || right == null) {
        return false;
    }

    return (
        left.chunkingMethod === right.chunkingMethod &&
        left.maxTokensPerChunk === right.maxTokensPerChunk &&
        left.overlapTokens === right.overlapTokens &&
        left.contextPrefix === right.contextPrefix
    );
}

