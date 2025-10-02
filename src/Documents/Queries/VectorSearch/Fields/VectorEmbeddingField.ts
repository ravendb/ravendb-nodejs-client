import { IVectorEmbeddingField, IVectorEmbeddingFieldFactoryAccessor } from "../../../Session/VectorFieldFactory.js";
import {VectorEmbeddingType} from "../VectorEmbeddingType.js";
import { Field } from "../../../../Types/index.js";
import { throwError } from "../../../../Exceptions/index.js";

export class VectorEmbeddingField<T> implements
    IVectorEmbeddingField, 
    IVectorEmbeddingFieldFactoryAccessor<T> {
    public fieldName: string;
    public sourceQuantizationType: VectorEmbeddingType;
    public destinationQuantizationType: VectorEmbeddingType;
    public isBase64Encoded: boolean;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(fieldName: Field<T>,
                sourceQuantizationType: VectorEmbeddingType = "Single",
                isBase64Encoded: boolean = false) {
        this.fieldName = fieldName;
        this.sourceQuantizationType = sourceQuantizationType;
        this.destinationQuantizationType = sourceQuantizationType;
        this.isBase64Encoded = isBase64Encoded;
    }


    public targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingField {
        if (targetEmbeddingQuantization === "Text") {
            throwError("InvalidOperationException", "Cannot quantize the embedding to Text. This option is only available for sourceQuantizationType.");
        }

        this.destinationQuantizationType = targetEmbeddingQuantization;

        if ((this.sourceQuantizationType === "Int8" ||
             this.sourceQuantizationType === "Binary") &&
             this.destinationQuantizationType !== this.sourceQuantizationType) {
            throwError("InvalidOperationException", `Cannot quantize already quantized embeddings. Source VectorEmbeddingType is ${this.sourceQuantizationType}; however the destination is ${this.destinationQuantizationType}.`);
        }

        return this;
    }
}
