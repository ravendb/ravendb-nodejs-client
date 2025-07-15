import {
    IVectorEmbeddingFieldFactoryAccessor,
    IVectorEmbeddingTextField
} from "../../../Session/VectorFieldFactory.js";
import { VectorEmbeddingType } from "../VectorEmbeddingType.js";
import { Field } from "../../../../Types/index.js";

export class VectorEmbeddingTextField<T> implements
    IVectorEmbeddingTextField, 
    IVectorEmbeddingFieldFactoryAccessor<T> {

    public fieldName: string;
    public sourceQuantizationType: VectorEmbeddingType = "Text";
    public destinationQuantizationType: VectorEmbeddingType = "Single";
    public isBase64Encoded: boolean = false;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(fieldName: Field<T>) {
        this.fieldName = fieldName;
    }


    public targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingTextField {
        if (targetEmbeddingQuantization === "Text") {
            throw new Error("Cannot quantize the embedding to Text. This option is only available for sourceQuantizationType.");
        }

        this.destinationQuantizationType = targetEmbeddingQuantization;
        return this;
    }

    public usingTask(embeddingsGenerationTaskIdentifier: string): IVectorEmbeddingTextField {
        if (this.sourceQuantizationType !== "Text") {
            throw new Error("The usingTask method can only be used with text embeddings (withText)");
        }

        this.embeddingsGenerationTaskIdentifier = embeddingsGenerationTaskIdentifier;
        return this;
    }
}
