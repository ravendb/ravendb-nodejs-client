import {
    IVectorField,
    IVectorFieldFactory,
    IVectorEmbeddingField,
    IVectorEmbeddingTextField,
    IVectorEmbeddingFieldFactoryAccessor
} from "../../Session/IVectorFieldFactory.js";
import { VectorEmbeddingType } from "../../Indexes/VectorSearch/index.js";

type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T;
};

export function toPropertyPath<T>(selector: (obj: T) => any): string {
    const fnStr = selector.toString();
    const match = fnStr.match(/\(?.*\)?\s*=>\s*.*?\.(.*?)(?:\W|$)/);
    return match ? match[1] : fnStr;
}


export class VectorEmbeddingFieldFactory<T> implements
    IVectorFieldFactory<T>,
    IVectorField,
    IVectorEmbeddingField,
    IVectorEmbeddingTextField,
    IVectorEmbeddingFieldFactoryAccessor {

    private _byFieldMethodUsed: boolean = false;

    public fieldName: string;
    public rawFieldName: string;
    public sourceQuantizationType: VectorEmbeddingType = "Single";
    public destinationQuantizationType: VectorEmbeddingType = "Single";
    public isBase64Encoded: boolean = false;
    public embeddingsGenerationTaskIdentifier: string;

    private getFormattedFieldName(fieldName: string): string {
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
        if (this._byFieldMethodUsed) {
            return fieldName;
        }

        // Get the appropriate embedding function from the configurationMap
        const embeddingFunction = configurationMap[this.sourceQuantizationType]?.[this.destinationQuantizationType];
        if (!embeddingFunction) {
            // If there's no valid mapping, return field name as is for invalid combinations
            return fieldName;
        }

        // For text source type with task identifier, handle specially
        if (this.sourceQuantizationType === "Text" && this.embeddingsGenerationTaskIdentifier) {
            return embeddingFunction ?
                `${embeddingFunction}(${fieldName}, ai.task('${this.embeddingsGenerationTaskIdentifier}'))` :
                fieldName;
        }

        // For empty embedding function (same source and destination for Single), return just the field name
        if (embeddingFunction === "") {
            return fieldName;
        }

        return `${embeddingFunction}(${fieldName})`;
    }

    withText(fieldName: string): IVectorEmbeddingTextField;
    withText(propertySelector: (field: T) => void): IVectorEmbeddingTextField;
    withText(fieldNameOrSelector: string | ((field: T) => void)): IVectorEmbeddingTextField {
        if (typeof fieldNameOrSelector === "string") {
            this.rawFieldName = fieldNameOrSelector;
        } else {
            this.rawFieldName = toPropertyPath(fieldNameOrSelector);
        }

        this.sourceQuantizationType = "Text";
        this.destinationQuantizationType = "Single";
        this.fieldName = this.getFormattedFieldName(this.rawFieldName);
        return this;
    }

    withEmbedding(fieldName: string, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;
    withEmbedding(propertySelector: (field: T) => void, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;
    withEmbedding(fieldNameOrSelector: string | ((field: T) => void), storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField {
        if (typeof fieldNameOrSelector === "string") {
            this.rawFieldName = fieldNameOrSelector;
        } else {
            this.rawFieldName = toPropertyPath(fieldNameOrSelector);
        }

        this.sourceQuantizationType = storedEmbeddingQuantization || "Single";
        this.destinationQuantizationType = this.sourceQuantizationType;

        this.fieldName = this.getFormattedFieldName(this.rawFieldName);

        return this;
    }

    withBase64(fieldName: string, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;
    withBase64(propertySelector: (field: T) => void, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;
    withBase64(fieldNameOrSelector: string | ((field: T) => void), storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField {
        if (typeof fieldNameOrSelector === "string") {
            this.rawFieldName = fieldNameOrSelector;
        } else {
            this.rawFieldName = toPropertyPath(fieldNameOrSelector);
        }

        this.sourceQuantizationType = storedEmbeddingQuantization || "Single";
        this.destinationQuantizationType = this.sourceQuantizationType;
        this.isBase64Encoded = true;

        this.fieldName = this.getFormattedFieldName(this.rawFieldName);
        return this;
    }

    withField(fieldName: string): IVectorField;
    withField(propertySelector: (field: T) => void): IVectorField;
    withField(fieldNameOrSelector: string | ((field: T) => void)): IVectorField {
        if (typeof fieldNameOrSelector === "string") {
            this.rawFieldName = fieldNameOrSelector;
        } else {
            this.rawFieldName = toPropertyPath(fieldNameOrSelector);
        }

        this._byFieldMethodUsed = true;
        this.fieldName = this.rawFieldName;
        return this;
    }

    targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingField & IVectorEmbeddingTextField {
        if (this._byFieldMethodUsed) {
            throw new Error("Cannot use method targetQuantization with withField since quantization is already done by the index.");
        }

        if (targetEmbeddingQuantization === "Text") {
            throw new Error("Cannot quantize the embedding to Text. This option is only available for sourceQuantizationType.");
        }

        this.destinationQuantizationType = targetEmbeddingQuantization;

        if ((this.sourceQuantizationType === "Int8" ||
             this.sourceQuantizationType === "Binary") &&
             this.destinationQuantizationType !== this.sourceQuantizationType) {
            throw new Error(`Cannot quantize already quantized embeddings. Source VectorEmbeddingType is ${this.sourceQuantizationType}; however the destination is ${this.destinationQuantizationType}.`);
        }

        this.fieldName = this.getFormattedFieldName(this.rawFieldName);
        return this;
    }

    usingTask(embeddingsGenerationTaskIdentifier: string): IVectorEmbeddingTextField {
        if (this.sourceQuantizationType !== "Text") {
            throw new Error("The usingTask method can only be used with text embeddings (withText)");
        }

        this.embeddingsGenerationTaskIdentifier = embeddingsGenerationTaskIdentifier;

        // Reformat field name with the task
        this.fieldName = this.getFormattedFieldName(this.rawFieldName);

        return this;
    }
}
