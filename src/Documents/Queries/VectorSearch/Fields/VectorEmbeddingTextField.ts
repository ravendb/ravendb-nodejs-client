import { IVectorEmbeddingFieldFactoryAccessor, IVectorEmbeddingTextField } from "../../../Session/IVectorFieldFactory.js";
import { VectorFieldBase } from "../Common/VectorFieldBase.js";
import {VectorEmbeddingType} from "../VectorEmbeddingType.js";
import { Field } from "../../../../Types/index.js";

export class VectorEmbeddingTextField<T> extends VectorFieldBase<T> implements
    IVectorEmbeddingTextField, 
    IVectorEmbeddingFieldFactoryAccessor<T> {

    public sourceQuantizationType: VectorEmbeddingType = "Text";
    public destinationQuantizationType: VectorEmbeddingType = "Single";
    public isBase64Encoded: boolean = false;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(fieldName: Field<T>) {
        super(fieldName);
        this.updateFieldName();
    }

    private updateFieldName(): void {
        this.fieldName = this.getFormattedFieldName(
            this.rawFieldName,
            this.sourceQuantizationType,
            this.destinationQuantizationType,
            this.embeddingsGenerationTaskIdentifier
        );
    }

    public targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingTextField {
        if (targetEmbeddingQuantization === "Text") {
            throw new Error("Cannot quantize the embedding to Text. This option is only available for sourceQuantizationType.");
        }

        this.destinationQuantizationType = targetEmbeddingQuantization;
        this.updateFieldName();
        return this;
    }

    public usingTask(embeddingsGenerationTaskIdentifier: string): IVectorEmbeddingTextField {
        if (this.sourceQuantizationType !== "Text") {
            throw new Error("The usingTask method can only be used with text embeddings (withText)");
        }

        this.embeddingsGenerationTaskIdentifier = embeddingsGenerationTaskIdentifier;
        this.updateFieldName();
        return this;
    }
}
