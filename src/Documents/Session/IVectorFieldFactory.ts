import { VectorEmbeddingType } from "../Indexes/VectorSearch/index.js";

export interface IVectorFieldFactory<T> {
    /**
     * Defines the text field that vector search will be performed on
     * @param fieldName Name of the document field containing text data
     */
    withText(fieldName: string): IVectorEmbeddingTextField;

    /**
     * Defines the text field that vector search will be performed on
     * @param propertySelector Path to the document field containing text data
     */
    withText(propertySelector: (field: T) => any): IVectorEmbeddingTextField;

    /**
     * Defines the embedding field that vector search will be performed on
     * @param fieldName Name of the document field containing embedding data
     * @param storedEmbeddingQuantization Quantization that was performed on stored embeddings
     */
    withEmbedding(fieldName: string, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;

    /**
     * Defines the embedding field that vector search will be performed on
     * @param propertySelector Path to the document field containing embedding data
     * @param storedEmbeddingQuantization Quantization that was performed on stored embeddings
     */
    withEmbedding(propertySelector: (field: T) => string | number[], storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;

    /**
     * Defines the embedding field (encoded as base64) that vector search will be performed on
     * @param fieldName Name of the document field containing base64 encoded embedding data
     * @param storedEmbeddingQuantization Quantization of stored embeddings
     */
    withBase64(fieldName: string, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;

    /**
     * Defines the embedding field (encoded as base64) that vector search will be performed on
     * @param propertySelector Path to the document field containing base64 encoded embedding data
     * @param storedEmbeddingQuantization Quantization of stored embeddings
     */
    withBase64(propertySelector: (field: T) => any, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;

    /**
     * Defines the field (that's already indexed) that vector search will be performed on
     * @param fieldName Name of the index-field containing indexed data
     */
    withField(fieldName: string): IVectorField;

    /**
     * Defines the field (that's already indexed) that vector search will be performed on
     * @param propertySelector Path to the index-field containing indexed data
     */
    withField(propertySelector: (field: T) => any): IVectorField;
}

export interface IVectorEmbeddingTextField {
    /**
     * Defines quantization that will be performed on embeddings that are already in the database
     * @param targetEmbeddingQuantization Desired target quantization type
     */
    targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingTextField;


    /**
     * TODO: This method is not implemented yet
     * Defines which task will be used to get embeddings from
     * @param embeddingsGenerationTaskIdentifier Task identifier
     */
    // usingTask(embeddingsGenerationTaskIdentifier: string): IVectorEmbeddingTextField;
}

export interface IVectorEmbeddingField {
    /**
     * Defines quantization that will be performed on embeddings that are already in the database
     * @param targetEmbeddingQuantization Desired target quantization type
     */
    targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingField;
}

export interface IVectorField {
    // Empty interface for type consistency
}

/**
 * Interface for accessing embedding field factory properties
 * @internal
 */
export interface IVectorEmbeddingFieldFactoryAccessor {
    fieldName: string;
    sourceQuantizationType: VectorEmbeddingType;
    destinationQuantizationType: VectorEmbeddingType;
    isBase64Encoded: boolean;
    embeddingsGenerationTaskIdentifier: string;
}

/**
 * Represents a RavenDB vector in TypeScript
 */
export interface IRavenVector<T> extends Array<T> {}

/**
 * Factory for providing text field values for vector searches
 */
export interface IVectorEmbeddingTextFieldValueFactory {
    /**
     * Defines queried text.
     * @param text Queried text
     */
    byText(text: string): void;

    /**
     * Defines queried texts.
     * @param texts Queried texts
     */
    byTexts(texts: string[]): void;
}

export interface IVectorEmbeddingFieldValueFactory {
    /**
     * Defines queried embedding.
     * @param embedding Enumerable containing embedding values
     */
    byEmbedding<T extends number>(embedding: Iterable<T>): void;

    /**
     * Defines queried embeddings.
     * @param embeddings Enumerable containing embeddings values
     */
    byEmbedding<T extends number>(embeddings: Iterable<Iterable<T>>): void;

    /**
     * Defines queried embedding.
     * @param embedding Array containing embedding values
     */
    byEmbedding<T extends number>(embedding: T[]): void;

    /**
     * Defines queried embedding.
     * @param embedding Object containing RavenVector
     */
    byEmbedding<T extends number>(embedding: { "@vector": IRavenVector<T> }): void;

    /**
     * Defines queried embeddings.
     * @param embeddings Array containing embeddings values
     */
    byEmbeddings<T extends number>(embeddings: T[][]): void;

    /**
     * Defines queried embedding in base64 format.
     * @param base64Embedding Embedding encoded as base64 string
     */
    byBase64(base64Embedding: string): void;

    /**
     * Defines queried embeddings in base64 format.
     * @param base64Embeddings Embeddings encoded as base64 strings
     */
    byBase64Embeddings(base64Embeddings: string[] | Iterable<string>): void;

    /**
     * Defines queried embedding.
     * @param embedding RavenVector containing embedding values
     */
    byEmbedding<T extends number>(embedding: {"@vector": IRavenVector<T>}): void;
}

export interface IVectorFieldValueFactory<T = any> extends
    IVectorEmbeddingTextFieldValueFactory,
    IVectorEmbeddingFieldValueFactory {
}

export interface IVectorFieldValueFactoryAccessor {
    /**
     * Gets or sets the embeddings
     */
    embeddings: object;

    /**
     * Gets or sets the text
     */
    text: string | null;

    /**
     * Gets or sets the texts collection
     */
    texts: string[];
}

export class VectorEmbeddingFieldValueFactory implements
    IVectorEmbeddingFieldValueFactory,
    IVectorFieldValueFactoryAccessor {

    public embeddings: object = null;
    public text: string | null = null;
    public texts: string[] = null;

    /**
     * Defines queried embedding.
     * @param embedding Iterable containing embedding values
     */
    public byEmbedding<T extends number>(embedding: Iterable<T>): void;
    public byEmbedding<T extends number>(embeddings: Iterable<Iterable<T>>): void;
    public byEmbedding<T extends number>(embedding: T[]): void;
    public byEmbedding<T extends number>(embedding: { "@vector": IRavenVector<T> }): void;
    public byEmbedding(embedding: any): void {
        this.embeddings = embedding;
    }

    /**
     * Defines queried embeddings.
     * @param embeddings Array containing embeddings values
     */
    public byEmbeddings<T extends number>(embeddings: T[][]): void {
        this.embeddings = embeddings;
    }

    /**
     * Defines queried embedding in base64 format.
     * @param base64Embedding Embedding encoded as base64 string
     */
    public byBase64(base64Embedding: string): void {
        this.text = base64Embedding;
    }

    /**
     * Defines queried embeddings in base64 format.
     * @param base64Embeddings Embeddings encoded as base64 strings
     */
    public byBase64Embeddings(base64Embeddings: string[] | Iterable<string>): void {
        this.texts = Array.isArray(base64Embeddings) ? base64Embeddings : Array.from(base64Embeddings);
    }

    /**
     * Defines queried text.
     * @param text Queried text
     */
    public byText(text: string): void {
        this.text = text;
    }

    /**
     * Defines queried texts.
     * @param texts Queried texts
     */
    public byTexts(texts: string[]): void {
        this.texts = texts;
    }
}

