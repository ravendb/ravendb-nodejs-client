import {
    IVectorEmbeddingField,
    IVectorEmbeddingFieldFactoryAccessor,
    IVectorEmbeddingTextField,
    IVectorField,
    IVectorFieldFactory
} from "./IVectorFieldFactory.js";
import { VectorEmbeddingType } from "../Indexes/VectorSearch/index.js";
import { getFieldNameFor } from "./DocumentQuery/QueryFieldUtil.js";

class VectorEmbeddingTextField implements
    IVectorEmbeddingTextField, 
    IVectorEmbeddingFieldFactoryAccessor {

    public fieldName: string;
    public sourceQuantizationType: VectorEmbeddingType = "Single";
    public destinationQuantizationType: VectorEmbeddingType = "Single";
    public isBase64Encoded: boolean = false;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(fieldName: string) {
        this.fieldName = fieldName;
    }

    public targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingTextField {
        this.destinationQuantizationType = targetEmbeddingQuantization;
        return this;
    }

    public usingTask(embeddingsGenerationTaskIdentifier: string): IVectorEmbeddingTextField {
        this.embeddingsGenerationTaskIdentifier = embeddingsGenerationTaskIdentifier;
        return this;
    }
}

class VectorEmbeddingField implements 
    IVectorEmbeddingField, 
    IVectorEmbeddingFieldFactoryAccessor {

    public fieldName: string;
    public sourceQuantizationType: VectorEmbeddingType;
    public destinationQuantizationType: VectorEmbeddingType;
    public isBase64Encoded: boolean;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(fieldName: string, 
                sourceQuantizationType: VectorEmbeddingType = "Single",
                isBase64Encoded: boolean = false) {
        this.fieldName = fieldName;
        this.sourceQuantizationType = sourceQuantizationType;
        this.destinationQuantizationType = sourceQuantizationType;
        this.isBase64Encoded = isBase64Encoded;
    }

    public targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingField {
        this.destinationQuantizationType = targetEmbeddingQuantization;
        return this;
    }
}

/**
 * Implementation of VectorField
 */
class VectorField implements IVectorField {
    public fieldName: string;

    constructor(fieldName: string) {
        this.fieldName = fieldName;
    }
}

export class VectorFieldFactory<T> implements IVectorFieldFactory<T> {
    
    public withText(fieldNameOrSelector: string | ((field: T) => any)): IVectorEmbeddingTextField {
        const fieldName = typeof fieldNameOrSelector === "string" 
            ? fieldNameOrSelector 
            : getFieldNameFor(fieldNameOrSelector);
        
        return new VectorEmbeddingTextField(fieldName);
    }

    public withEmbedding(
        fieldNameOrSelector: string | ((field: T) => any), 
        storedEmbeddingQuantization: VectorEmbeddingType = "Single"
    ): IVectorEmbeddingField {
        const fieldName = typeof fieldNameOrSelector === "string" 
            ? fieldNameOrSelector 
            : getFieldNameFor(fieldNameOrSelector);
        
        return new VectorEmbeddingField(fieldName, storedEmbeddingQuantization, false);
    }

    public withBase64(
        fieldNameOrSelector: string | ((field: T) => any),
        storedEmbeddingQuantization: VectorEmbeddingType = "Single"
    ): IVectorEmbeddingField {
        const fieldName = typeof fieldNameOrSelector === "string" 
            ? fieldNameOrSelector 
            : getFieldNameFor(fieldNameOrSelector);
        
        return new VectorEmbeddingField(fieldName, storedEmbeddingQuantization, true);
    }

    public withField(fieldNameOrSelector: string | ((field: T) => any)): IVectorField {
        const fieldName = typeof fieldNameOrSelector === "string" 
            ? fieldNameOrSelector 
            : getFieldNameFor(fieldNameOrSelector);
        
        return new VectorField(fieldName);
    }
}
