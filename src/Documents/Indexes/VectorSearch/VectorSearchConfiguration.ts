import { VectorEmbeddingType } from "./VectorEmbeddingType.js";

/**
 * Helper class for configuring vector search operations
 */
export class VectorSearchConfiguration {
    /**
     * Default value for exact search flag
     */
    public static readonly DEFAULT_IS_EXACT: boolean = false;
    
    /**
     * Determines the appropriate method name based on source and target quantization types
     * 
     * @param sourceType Source vector embedding type
     * @param targetType Target vector embedding type
     */
    public static configurationToMethodName(
        sourceType: VectorEmbeddingType, 
        targetType: VectorEmbeddingType
    ): string {
        if (sourceType === targetType) {
            return sourceType.toLowerCase();
        }
        
        return `${sourceType.toLowerCase()}_to_${targetType.toLowerCase()}`;
    }
}
