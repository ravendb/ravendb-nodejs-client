import { VectorEmbeddingType } from "../Queries/VectorSearch/VectorEmbeddingType.js";
import { Field } from "../../Types/index.js";

export interface IVectorFieldFactory<T> {
    /**
     * Defines the text field that vector search will be performed on
     * @param fieldName Name of the document field containing text data
     */
    withText(fieldName: Field<T>): IVectorEmbeddingTextField;

    /**
     * Defines the embedding field that vector search will be performed on
     * @param fieldName Name of the document field containing embedding data
     * @param storedEmbeddingQuantization Quantization that was performed on stored embeddings
     */
    withEmbedding(fieldName: Field<T>, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;

    /**
     * Defines the embedding field (encoded as base64) that vector search will be performed on
     * @param fieldName Name of the document field containing base64 encoded embedding data
     * @param storedEmbeddingQuantization Quantization of stored embeddings
     */
    withBase64(fieldName: Field<T>, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;

    /**
     * Defines the field (that's already indexed) that vector search will be performed on
     * @param fieldName Name of the index-field containing indexed data
     */
    withField(fieldName: Field<T>): IVectorField;
}

export interface IVectorEmbeddingTextField {
    /**
     * Defines quantization that will be performed on embeddings that are already in the database
     * @param targetEmbeddingQuantization Desired target quantization type
     */
    targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingTextField;


    /**
     * Defines which task will be used to get embeddings from
     * @param embeddingsGenerationTaskIdentifier Task identifier
     */
    usingTask(embeddingsGenerationTaskIdentifier: string): IVectorEmbeddingTextField;
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
export interface IVectorEmbeddingFieldFactoryAccessor<T> {
    fieldName: Field<T>;
    sourceQuantizationType: VectorEmbeddingType;
    destinationQuantizationType: VectorEmbeddingType;
    isBase64Encoded: boolean;
    embeddingsGenerationTaskIdentifier: string;
}

/**
 * Represents a RavenDB vector in TypeScript
 */
export interface IRavenVector<T> extends Array<T> {
}

/**
 * Factory for providing text field values for vector searches
 */
export interface IVectorEmbeddingTextFieldValueFactory {
    /**
     * Defines queried text.
     * @param text Queried text
     * @param embeddingsGenerationTaskIdentifier Task identifier for embeddings generation
     */
    byText(text: string, embeddingsGenerationTaskIdentifier?: string): void;

    /**
     * Query by the embedding(s) indexed from the specified document for the quried field.
     * @param documentId The unique identifier of the document to be processed.
     */
    forDocument(documentId: string): void;

    /**
     * Defines queried texts.
     * @param texts Queried texts
     * @param embeddingsGenerationTaskIdentifier Task identifier for embeddings generation
     */
    byTexts(texts: string[], embeddingsGenerationTaskIdentifier?: string): void;
}

export interface IVectorEmbeddingFieldValueFactory {
    /**
     * Defines queried embedding.
     * @param embedding Array containing embedding values
     */
    byEmbedding<T extends number>(embedding: T[]): void;

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
     * Defines queried embedding.
     * @param embedding RavenVector containing embedding values
     */
    byEmbedding<T extends number>(embedding: { "@vector": IRavenVector<T> }): void;

    /**
     * Query by the embedding(s) indexed from the specified document for the queried field.
     * @param documentId The unique identifier of the document to be processed.
     */
    forDocument(documentId: string): void;
}

export interface IVectorFieldValueFactory extends IVectorEmbeddingTextFieldValueFactory,
    IVectorEmbeddingFieldValueFactory {
}

export interface IVectorFieldValueFactoryAccessor {
    embeddings: number[][];

    embedding: number[];

    text: string;

    texts: string[];

    byId: string;

    embeddingsGenerationTaskIdentifier: string;
}

export class VectorEmbeddingFieldValueFactory implements IVectorEmbeddingFieldValueFactory,
    IVectorFieldValueFactoryAccessor {

    public embedding: number[] = null;
    public embeddings: number[][] = null;
    public text: string = null;
    public texts: string[] = null;
    public byId: string = null;
    public embeddingsGenerationTaskIdentifier: string = null;

    public byEmbedding<T extends number>(embedding: T[]): void;
    public byEmbedding<T extends number>(embedding: { "@vector": IRavenVector<T> }): void;
    public byEmbedding(embedding: any): void {
        this.embedding = embedding;
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
     * Defines queried text.
     * @param text Queried text
     * @param embeddingsGenerationTaskIdentifier Task identifier for embeddings generation
     */
    public byText(text: string, embeddingsGenerationTaskIdentifier?: string): void {
        this.text = text;
        this.embeddingsGenerationTaskIdentifier = embeddingsGenerationTaskIdentifier;
    }

    /**
     * Defines queried texts.
     * @param texts Queried texts
     * @param embeddingsGenerationTaskIdentifier Task identifier for embeddings generation
     */
    public byTexts(texts: string[], embeddingsGenerationTaskIdentifier?: string): void {
        this.texts = texts;
        this.embeddingsGenerationTaskIdentifier = embeddingsGenerationTaskIdentifier;
    }

    public forDocument(documentId: string): void {
        this.byId = documentId;
    }
}
