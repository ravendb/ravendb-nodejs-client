import { WhereToken } from "./WhereToken.js";
import { VectorEmbeddingType } from "../../Queries/VectorSearch/VectorEmbeddingType.js";
import { StringBuilder } from "../../../Utility/StringBuilder.js";
import { vectorSearchConfigurationToMethodName } from "../../../Utility/VectorSearchUtil.js";
import { IVectorEmbeddingFieldFactoryAccessor } from "../VectorFieldFactory.js";
import { throwError } from "../../../Exceptions/index.js";

export class VectorSearchToken extends WhereToken {
    static readonly EMBEDDING_PREFIX = "embedding.";
    static readonly EMBEDDING_FOR_DOCUMENT = VectorSearchToken.EMBEDDING_PREFIX + "forDoc";
    static readonly EMBEDDING_FOR_RAW = VectorSearchToken.EMBEDDING_PREFIX + "Raw";
    static readonly EMBEDDING_TEXT = VectorSearchToken.EMBEDDING_PREFIX + "text";
    static readonly EMBEDDING_TEXT_INT8 = VectorSearchToken.EMBEDDING_PREFIX + "text_i8";
    static readonly EMBEDDING_TEXT_INT1 = VectorSearchToken.EMBEDDING_PREFIX + "text_i1";
    static readonly EMBEDDING_SINGLE = VectorSearchToken.EMBEDDING_PREFIX + "f32";
    static readonly EMBEDDING_SINGLE_INT8 = VectorSearchToken.EMBEDDING_PREFIX + "f32_i8";
    static readonly EMBEDDING_SINGLE_INT1 = VectorSearchToken.EMBEDDING_PREFIX + "f32_i1";
    static readonly EMBEDDING_INT8 = VectorSearchToken.EMBEDDING_PREFIX + "i8";
    static readonly EMBEDDING_INT1 = VectorSearchToken.EMBEDDING_PREFIX + "i1";
    public static readonly DEFAULT_EMBEDDING_TYPE: VectorEmbeddingType = "Single";
    public static readonly DEFAULT_IS_EXACT = false;
    private static readonly AI_TASK_METHOD_NAME = "ai.task";
    private readonly _similarityThreshold: number | null;
    private readonly _sourceQuantizationType: VectorEmbeddingType;
    private readonly _targetQuantizationType: VectorEmbeddingType;
    private readonly _numberOfCandidatesForQuerying: number | null;
    private readonly _isDocumentId: boolean;
    private readonly _embeddingsGenerationTaskIdentifier: string | null;
    private readonly _embeddingsGenerationTaskIdentifierByValue: string | null;

    public constructor(
        fieldName: string,
        parameterName: string,
        sourceQuantizationType: VectorEmbeddingType,
        targetQuantizationType: VectorEmbeddingType,
        similarityThreshold: number | null,
        numberOfCandidatesForQuerying: number | null,
        isExact: boolean,
        isDocumentId: boolean,
        embeddingsGenerationTaskIdentifier: string | null,
        embeddingsGenerationTaskIdentifierByValue: string | null
    ) {
        super();
        this.fieldName = fieldName;
        this.parameterName = parameterName;

        this._sourceQuantizationType = sourceQuantizationType;
        this._targetQuantizationType = targetQuantizationType;
        this._similarityThreshold = similarityThreshold;
        this._numberOfCandidatesForQuerying = numberOfCandidatesForQuerying;
        this._isDocumentId = isDocumentId;
        this._embeddingsGenerationTaskIdentifier = embeddingsGenerationTaskIdentifier;
        this._embeddingsGenerationTaskIdentifierByValue = embeddingsGenerationTaskIdentifierByValue;

        if (embeddingsGenerationTaskIdentifier != null && embeddingsGenerationTaskIdentifierByValue != null) {
            throwError("InvalidOperationException", "Embeddings generation task identifier set in value factory cannot be used with field factory. It solely purpose to use already generated embeddings.");
        }

        this.options = {
            exact: isExact,
            boost: null,
            fuzzy: null,
            proximity: null,
            searchOperator: null,
            fromParameterName: null,
            toParameterName: null,
            method: null,
            whereShape: null,
            distanceErrorPct: null,
            vectorSearch: null
        };
    }

    public static getTaskIdentifier<T>(fieldAccessor: IVectorEmbeddingFieldFactoryAccessor<T>): string | null {
        if (fieldAccessor.embeddingsGenerationTaskIdentifier) {
            return fieldAccessor.embeddingsGenerationTaskIdentifier;
        }
        return null;
    }

    public static getSourceQuantizationType<T>(fieldAccessor: IVectorEmbeddingFieldFactoryAccessor<T>): VectorEmbeddingType {
        if (fieldAccessor.sourceQuantizationType) {
            return fieldAccessor.sourceQuantizationType;
        }
        return VectorSearchToken.DEFAULT_EMBEDDING_TYPE;
    }

    public static getTargetQuantizationType<T>(fieldAccessor: IVectorEmbeddingFieldFactoryAccessor<T>): VectorEmbeddingType {
        if (fieldAccessor.destinationQuantizationType) {
            return fieldAccessor.destinationQuantizationType;
        }
        return VectorSearchToken.DEFAULT_EMBEDDING_TYPE;
    }

    public writeTo(writer: StringBuilder): void {
        if (this.options.boost != null) {
            writer.append("boost(");
        }

        if (this.options.exact) {
            writer.append("exact(");
        }

        writer.append("vector.search(");

        if (this._sourceQuantizationType === "Single" && this._targetQuantizationType === "Single") {
            writer.append(this.fieldName);
        } else {
            const methodName = vectorSearchConfigurationToMethodName(this._sourceQuantizationType, this._targetQuantizationType);

            if (this._sourceQuantizationType === "Text" && this._embeddingsGenerationTaskIdentifier != null) {
                writer.append(`${methodName}(${this.fieldName}, ${VectorSearchToken.AI_TASK_METHOD_NAME}('${this._embeddingsGenerationTaskIdentifier}'))`);
            } else {
                writer.append(`${methodName}(${this.fieldName})`);
            }
        }

        writer.append(", ");

        writer.append(this.getEmbeddingExpression());

        const parametersAreDefault = this._similarityThreshold == null &&
            this._numberOfCandidatesForQuerying == null;

        if (!parametersAreDefault) {
            writer.append(", ").append(this._similarityThreshold?.toString() ?? "null");
            writer.append(", ").append(this._numberOfCandidatesForQuerying?.toString() ?? "null");
        }

        writer.append(')');

        if (this.options.exact) {
            writer.append(')');
        }

        if (this.options.boost != null) {
            writer.append(`, ${this.options.boost.toString()})`);
        }
    }

    private getEmbeddingExpression() {
        if (this._isDocumentId) {
            return `${VectorSearchToken.EMBEDDING_FOR_DOCUMENT}($${this.parameterName})`;
        }
        if (this._embeddingsGenerationTaskIdentifierByValue != null) {
            return `${VectorSearchToken.EMBEDDING_TEXT}($${this.parameterName}, ${VectorSearchToken.AI_TASK_METHOD_NAME}('${this._embeddingsGenerationTaskIdentifierByValue}'))`;
        }
        return `$${this.parameterName}`;
    }
}