import { ChunkingOptions, areChunkingOptionsEqual } from "./ChunkingOptions.js";

/**
 * Configuration for generating embeddings from a specific document field path.
 */
export interface EmbeddingPathConfiguration {
    /**
     * JSON path to the document field (e.g., "Description", "Content.Text").
     */
    path: string;

    /**
     * Chunking configuration for this specific field.
     */
    chunkingOptions: ChunkingOptions;
}

/**
 * Compares two EmbeddingPathConfiguration objects for equality.
 * @param left First configuration to compare
 * @param right Second configuration to compare
 * @returns true if both are equal or both are null/undefined, false otherwise
 */
export function areEmbeddingPathConfigurationsEqual(
    left: EmbeddingPathConfiguration,
    right: EmbeddingPathConfiguration
): boolean {
    if (left == null && right == null) {
        return true;
    }

    if (left == null || right == null) {
        return false;
    }

    return (
        left.path === right.path &&
        areChunkingOptionsEqual(left.chunkingOptions, right.chunkingOptions)
    );
}

