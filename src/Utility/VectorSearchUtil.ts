import { IRavenVector } from "../Documents/Session/VectorFieldFactory.js";
import { VectorEmbeddingType } from "../Documents/Queries/VectorSearch/VectorEmbeddingType.js";
import { throwError } from "../Exceptions/index.js";
import { VectorSearchToken } from "../Documents/Session/Tokens/VectorSearchToken.js";

export function RavenVector<T>(vector: IRavenVector<T>): { "@vector": IRavenVector<T> } {
    return {"@vector": vector}
}

export function vectorSearchConfigurationToMethodName(source: VectorEmbeddingType, dest: VectorEmbeddingType): string {
    if (source === "Single" && dest === "Single") {
        return "";
    }
    if (source === "Single" && dest === "Int8") {
        return VectorSearchToken.EMBEDDING_SINGLE_INT8;
    }
    if (source === "Single" && dest === "Binary") {
        return VectorSearchToken.EMBEDDING_SINGLE_INT1;
    }
    if (source === "Text" && dest === "Single") {
        return VectorSearchToken.EMBEDDING_TEXT;
    }
    if (source === "Text" && dest === "Int8") {
        return VectorSearchToken.EMBEDDING_TEXT_INT8;
    }
    if (source === "Text" && dest === "Binary") {
        return VectorSearchToken.EMBEDDING_TEXT_INT1;
    }
    if (source === "Int8" && dest === "Int8") {
        return VectorSearchToken.EMBEDDING_INT8;
    }
    if (source === "Binary" && dest === "Binary") {
        return VectorSearchToken.EMBEDDING_INT1;
    }

    throwError("InvalidOperationException",
        `Invalid embedding configuration. SourceEmbedding: ${source}, DestinationEmbedding: ${dest}`);
}