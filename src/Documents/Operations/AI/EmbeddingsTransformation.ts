import { ChunkingOptions, areChunkingOptionsEqual, validateChunkingOptions } from "./ChunkingOptions.js";

/**
 * The name of the function that must be called in transformation scripts to generate embeddings.
 */
export const GENERATE_EMBEDDINGS_FUNCTION_NAME = "embeddings.generate";

/**
 * Configuration for a custom transformation script that generates embeddings.
 */
export interface EmbeddingsTransformation {
    /**
     * JavaScript transformation script.
     * Must call embeddings.generate() function.
     */
    script: string;

    /**
     * Chunking configuration for the transformation output.
     */
    chunkingOptions: ChunkingOptions;
}

/**
 * Validates an embeddings transformation and returns an array of error messages.
 * @param transformation The transformation to validate
 * @returns Array of validation error messages, empty if valid
 */
export function validateEmbeddingsTransformation(transformation: EmbeddingsTransformation): string[] {
    const errors: string[] = [];

    if (!transformation) {
        errors.push("EmbeddingsTransformation must be provided.");
        return errors;
    }

    // Validate script
    if (!transformation.script) {
        errors.push("Transformation script must be provided.");
    } else if (!transformation.script.includes(GENERATE_EMBEDDINGS_FUNCTION_NAME)) {
        errors.push(`Transformation script must use ${GENERATE_EMBEDDINGS_FUNCTION_NAME} method.`);
    }

    // Validate chunking options
    if (transformation.chunkingOptions) {
        const chunkingErrors = validateChunkingOptions(
            GENERATE_EMBEDDINGS_FUNCTION_NAME,
            transformation.chunkingOptions
        );
        errors.push(...chunkingErrors);
    } else {
        errors.push("ChunkingOptions must be provided for transformation.");
    }

    return errors;
}

/**
 * Compares two EmbeddingsTransformation objects for equality.
 * @param left First transformation to compare
 * @param right Second transformation to compare
 * @returns true if both are equal or both are null/undefined, false otherwise
 */
export function areEmbeddingsTransformationsEqual(
    left: EmbeddingsTransformation | null | undefined,
    right: EmbeddingsTransformation | null | undefined
): boolean {
    if (left == null && right == null) {
        return true;
    }

    if (left == null || right == null) {
        return false;
    }

    return (
        left.script === right.script &&
        areChunkingOptionsEqual(left.chunkingOptions, right.chunkingOptions)
    );
}

