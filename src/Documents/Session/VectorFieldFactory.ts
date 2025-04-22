import {
    IVectorEmbeddingField,
    IVectorEmbeddingFieldFactoryAccessor,
    IVectorEmbeddingTextField,
    IVectorField,
    IVectorFieldFactory
} from "./IVectorFieldFactory.js";
import { VectorEmbeddingType } from "../Queries/VectorSearch/VectorEmbeddingType.js";
import { Field } from "../../Types/index.js";

type PartialRecord<K extends keyof any, T> = {
    [P in K]?: T;
};

abstract class VectorFieldBase<T> {
    public rawFieldName: keyof T;
    public fieldName: Field<T>;

    constructor(fieldName: Field<T>) {
        this.rawFieldName = fieldName as keyof T;
        this.fieldName = fieldName as string;
    }

    protected getFormattedFieldName(rawFieldName: Field<T>, sourceType: VectorEmbeddingType,
                                   destType: VectorEmbeddingType,
                                   taskIdentifier?: string, byFieldMethodUsed = false): string {
        const configurationMap: Record<VectorEmbeddingType, PartialRecord<VectorEmbeddingType, string>> = {
            Single: {
                Single: "",
                Int8: "embedding.f32_i8",
                Binary: "embedding.f32_i1",
            },
            Text: {
                Single: "embedding.text",
                Int8: "embedding.text_i8",
                Binary: "embedding.text_i1",
            },
            Int8: {
                Int8: "embedding.i8",
            },
            Binary: {
                Binary: "embedding.i1",
            },
        };

        // If using withField, return the field name as is
        if (byFieldMethodUsed) {
            return rawFieldName;
        }

        // Get the appropriate embedding function from the configurationMap
        const embeddingFunction = configurationMap[sourceType]?.[destType];
        if (!embeddingFunction) {
            // If there's no valid mapping, return field name as is for invalid combinations
            return rawFieldName;
        }

        // For text source type with task identifier, handle specially
        if (sourceType === "Text" && taskIdentifier) {
            // Apply embedding function with task and wrap task identifier with ai.task()
            return embeddingFunction ?
                `${embeddingFunction}(${rawFieldName}, ai.task('${taskIdentifier}'))` :
                rawFieldName;
        }

        // For empty embedding function (same source and destination for Single), return just the field name
        if (embeddingFunction === "") {
            return rawFieldName;
        }

        // Apply the embedding function
        return `${embeddingFunction}(${rawFieldName})`;
    }
}

class VectorEmbeddingTextField<T> extends VectorFieldBase<T> implements
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
            this.rawFieldName as string,
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

class VectorEmbeddingField<T> extends VectorFieldBase<T> implements
    IVectorEmbeddingField,
    IVectorEmbeddingFieldFactoryAccessor<T> {

    public sourceQuantizationType: VectorEmbeddingType;
    public destinationQuantizationType: VectorEmbeddingType;
    public isBase64Encoded: boolean;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(
        fieldName: Field<T>,
        sourceQuantizationType: VectorEmbeddingType = "Single",
        isBase64Encoded: boolean = false
    ) {
        super(fieldName);
        this.sourceQuantizationType = sourceQuantizationType;
        this.destinationQuantizationType = sourceQuantizationType;
        this.isBase64Encoded = isBase64Encoded;
        this.updateFieldName();
    }

    private updateFieldName(): void {
        this.fieldName = this.getFormattedFieldName(
            this.rawFieldName as Field<T>,
            this.sourceQuantizationType,
            this.destinationQuantizationType
        );
    }

    public targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingField {
        if (targetEmbeddingQuantization === "Text") {
            throw new Error("Cannot quantize the embedding to Text. This option is only available for sourceQuantizationType.");
        }

        this.destinationQuantizationType = targetEmbeddingQuantization;

        if (
            (this.sourceQuantizationType === "Int8" || this.sourceQuantizationType === "Binary") &&
            this.destinationQuantizationType !== this.sourceQuantizationType
        ) {
            throw new Error(`Cannot quantize already quantized embeddings. Source VectorEmbeddingType is ${this.sourceQuantizationType}; however the destination is ${this.destinationQuantizationType}.`);
        }

        this.updateFieldName();
        return this;
    }
}

class VectorField<T> extends VectorFieldBase<T> implements IVectorField {
    constructor(fieldName: Field<T>) {
        super(fieldName);
        this.fieldName = fieldName;
    }
}

export class VectorFieldFactory<T> implements IVectorFieldFactory<T> {

    public withText(fieldName: Field<T>): IVectorEmbeddingTextField {
        return new VectorEmbeddingTextField(fieldName);
    }

    public withEmbedding(
        fieldName: Field<T>,
        storedEmbeddingQuantization: VectorEmbeddingType = "Single"
    ): IVectorEmbeddingField {
        return new VectorEmbeddingField(fieldName, storedEmbeddingQuantization, false);
    }

    public withBase64(
        fieldName: Field<T>,
        storedEmbeddingQuantization: VectorEmbeddingType = "Single"
    ): IVectorEmbeddingField {
        return new VectorEmbeddingField(fieldName, storedEmbeddingQuantization, true);
    }

    public withField(fieldName: Field<T>): IVectorField {
        return new VectorField(fieldName);
    }
}