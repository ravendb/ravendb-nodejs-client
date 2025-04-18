import { IVectorEmbeddingField, IVectorEmbeddingFieldFactoryAccessor } from "../../../Session/IVectorFieldFactory.js";
import { VectorFieldBase } from "../Common/VectorFieldBase.js";
import {VectorEmbeddingType} from "../VectorEmbeddingType.js";
import { Field } from "../../../../Types/index.js";

export class VectorEmbeddingField<T> extends VectorFieldBase<T> implements
    IVectorEmbeddingField, 
    IVectorEmbeddingFieldFactoryAccessor<T> {

    public sourceQuantizationType: VectorEmbeddingType;
    public destinationQuantizationType: VectorEmbeddingType;
    public isBase64Encoded: boolean;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(fieldName: Field<T>,
                sourceQuantizationType: VectorEmbeddingType = "Single",
                isBase64Encoded: boolean = false) {
        super(fieldName);
        this.sourceQuantizationType = sourceQuantizationType;
        this.destinationQuantizationType = sourceQuantizationType;
        this.isBase64Encoded = isBase64Encoded;
        this.updateFieldName();
    }

    private updateFieldName(): void {
        this.fieldName = this.getFormattedFieldName(
            this.rawFieldName,
            this.sourceQuantizationType,
            this.destinationQuantizationType
        );
    }

    public targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingField {
        if (targetEmbeddingQuantization === "Text") {
            throw new Error("Cannot quantize the embedding to Text. This option is only available for sourceQuantizationType.");
        }

        this.destinationQuantizationType = targetEmbeddingQuantization;

        if ((this.sourceQuantizationType === "Int8" ||
             this.sourceQuantizationType === "Binary") &&
             this.destinationQuantizationType !== this.sourceQuantizationType) {
            throw new Error(`Cannot quantize already quantized embeddings. Source VectorEmbeddingType is ${this.sourceQuantizationType}; however the destination is ${this.destinationQuantizationType}.`);
        }

        this.updateFieldName();
        return this;
    }
}
