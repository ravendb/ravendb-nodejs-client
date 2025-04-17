import {
    IVectorEmbeddingField,
    IVectorEmbeddingFieldFactoryAccessor,
    IVectorEmbeddingTextField,
    IVectorField,
    IVectorFieldFactory
} from "./IVectorFieldFactory.js";
import { VectorEmbeddingType } from "../Indexes/VectorSearch/index.js";
import { getFieldNameFor } from "./DocumentQuery/QueryFieldUtil.js";

type PartialRecord<K extends keyof any, T> = {
    [P in K]?: T;
};

abstract class VectorFieldBase {
    public rawFieldName: string;
    public fieldName: string;

    constructor(fieldName: string) {
        this.rawFieldName = fieldName;
        this.fieldName = fieldName;
    }

    protected getFormattedFieldName(rawFieldName: string, sourceType: VectorEmbeddingType,
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

class VectorEmbeddingTextField extends VectorFieldBase implements
    IVectorEmbeddingTextField, 
    IVectorEmbeddingFieldFactoryAccessor {

    public sourceQuantizationType: VectorEmbeddingType = "Text";
    public destinationQuantizationType: VectorEmbeddingType = "Single";
    public isBase64Encoded: boolean = false;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(fieldName: string) {
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

class VectorEmbeddingField extends VectorFieldBase implements
    IVectorEmbeddingField, 
    IVectorEmbeddingFieldFactoryAccessor {

    public sourceQuantizationType: VectorEmbeddingType;
    public destinationQuantizationType: VectorEmbeddingType;
    public isBase64Encoded: boolean;
    public embeddingsGenerationTaskIdentifier: string = "";

    constructor(fieldName: string, 
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

class VectorField extends VectorFieldBase implements IVectorField {
    constructor(fieldName: string) {
        super(fieldName);
        this.fieldName = fieldName;
    }
}

export class VectorFieldFactory<T> implements IVectorFieldFactory<T> {

    public withText(fieldNameOrSelector: string | ((field: T) => void)): IVectorEmbeddingTextField {
        const fieldName = typeof fieldNameOrSelector === "string" 
            ? fieldNameOrSelector 
            : getFieldNameFor(fieldNameOrSelector);

        return new VectorEmbeddingTextField(fieldName);
    }

    public withEmbedding(
        fieldNameOrSelector: string | ((field: T) => void),
        storedEmbeddingQuantization: VectorEmbeddingType = "Single"
    ): IVectorEmbeddingField {
        const fieldName = typeof fieldNameOrSelector === "string" 
            ? fieldNameOrSelector 
            : getFieldNameFor(fieldNameOrSelector);
        
        return new VectorEmbeddingField(fieldName, storedEmbeddingQuantization, false);
    }

    public withBase64(
        fieldNameOrSelector: string | ((field: T) => void),
        storedEmbeddingQuantization: VectorEmbeddingType = "Single"
    ): IVectorEmbeddingField {
        const fieldName = typeof fieldNameOrSelector === "string" 
            ? fieldNameOrSelector 
            : getFieldNameFor(fieldNameOrSelector);
        
        return new VectorEmbeddingField(fieldName, storedEmbeddingQuantization, true);
    }

    public withField(fieldNameOrSelector: string | ((field: T) => void)): IVectorField {
        const fieldName = typeof fieldNameOrSelector === "string" 
            ? fieldNameOrSelector 
            : getFieldNameFor(fieldNameOrSelector);
        
        return new VectorField(fieldName);
    }
}
