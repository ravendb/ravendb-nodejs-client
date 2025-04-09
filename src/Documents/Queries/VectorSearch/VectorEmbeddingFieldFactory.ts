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

/**
 * Utility for converting property selector functions to property paths
 */
export function toPropertyPath<T>(selector: (obj: T) => any): string {
    const fnStr = selector.toString();
    const match = fnStr.match(/\(?.*\)?\s*=>\s*.*?\.(.*?)(?:\W|$)/);
    return match ? match[1] : fnStr;
}



/**
 * Factory for embedding field vector search operations
 */
export class VectorEmbeddingFieldFactory<T> implements 
    IVectorFieldFactory<T>,
    IVectorField, 
    IVectorEmbeddingField, 
    IVectorEmbeddingTextField, 
    IVectorEmbeddingFieldFactoryAccessor {

    private _byFieldMethodUsed: boolean = false;

    public fieldName: string;
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

        console.log("@@getFormattedFieldName", this.sourceQuantizationType, this.destinationQuantizationType)

        // If using withField, return the field name as is
        if (this._byFieldMethodUsed) {
        console.log("@@whichIf1")
            return fieldName;
        }

        // Get the appropriate embedding function from the configurationMap
        const embeddingFunction = configurationMap[this.sourceQuantizationType]?.[this.destinationQuantizationType];
        if (!embeddingFunction) {
        console.log("@@whichIf2")
            // If there's no valid mapping, return field name as is for invalid combinations
            return fieldName;
        }

        // For text source type with task identifier, handle specially
        if (this.sourceQuantizationType === "Text" && this.embeddingsGenerationTaskIdentifier) {
        console.log("@@whichIf3")
            // Apply embedding function with task
            return embeddingFunction ? `${embeddingFunction}(${fieldName}, '${this.embeddingsGenerationTaskIdentifier}')` : fieldName;
        }

        // For empty embedding function (same source and destination for Single), return just the field name
        if (embeddingFunction === "") {
        console.log("@@whichIf4")
            return fieldName;
        }

        // Apply the embedding function
        console.log("@@whichIf5", embeddingFunction, fieldName)
        return `${embeddingFunction}(${fieldName})`;
    }

    /*
    public getFormattedFieldName(fieldName: string): string {
    const configurationMap: Record<"Single" | "Text" | "Int8" | "Binary", PartialRecord<"Single" | "Text" | "Int8" | "Binary", string>> = {
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
            Int8: "embedding.int8",
        },
        Binary: {
            Binary: "embedding.binary",
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
        // Apply embedding function with task
        return embeddingFunction ? `${embeddingFunction}(${fieldName}, '${this.embeddingsGenerationTaskIdentifier}')` : fieldName;
    }

    // For empty embedding function (same source and destination for Single), return just the field name
    if (embeddingFunction === "") {
        return fieldName;
    }

    // Apply the embedding function
    return `${embeddingFunction}(${fieldName})`;
}
     */

    withText(fieldName: string): IVectorEmbeddingTextField;
    withText(propertySelector: (field: T) => any): IVectorEmbeddingTextField;
    withText(fieldNameOrSelector: string | ((field: T) => any)): IVectorEmbeddingTextField {
        console.log(fieldNameOrSelector);
        if (typeof fieldNameOrSelector === "string") {
            this.fieldName = `${fieldNameOrSelector}`;
        } else {
            console.log("@@@", toPropertyPath(fieldNameOrSelector));
            this.fieldName = toPropertyPath(fieldNameOrSelector);
        }

        this.sourceQuantizationType = "Text";
        this.destinationQuantizationType = "Single";
        this.fieldName = this.getFormattedFieldName(this.fieldName)
        return this;
    }

    withEmbedding(fieldName: string, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;
    withEmbedding(propertySelector: (field: T) => any, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;
    withEmbedding(fieldNameOrSelector: string | ((field: T) => any), storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField {
        if (typeof fieldNameOrSelector === "string") {
            this.fieldName = fieldNameOrSelector;
        } else {
            this.fieldName = toPropertyPath(fieldNameOrSelector);
        }
        
        this.sourceQuantizationType = storedEmbeddingQuantization || "Single";
        this.destinationQuantizationType = this.sourceQuantizationType;

        this.fieldName = this.getFormattedFieldName(this.fieldName);

        return this;
    }

    withBase64(fieldName: string, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;
    withBase64(propertySelector: (field: T) => any, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField;
    withBase64(fieldNameOrSelector: string | ((field: T) => any), storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField {
        if (typeof fieldNameOrSelector === "string") {
            this.fieldName = fieldNameOrSelector;
        } else {
            this.fieldName = toPropertyPath(fieldNameOrSelector);
        }
        
        this.sourceQuantizationType = storedEmbeddingQuantization || "Single";
        this.destinationQuantizationType = this.sourceQuantizationType;
        this.isBase64Encoded = true;
        
        return this;
    }

    withField(fieldName: string): IVectorField;
    withField(propertySelector: (field: T) => any): IVectorField;
    withField(fieldNameOrSelector: string | ((field: T) => any)): IVectorField {
        if (typeof fieldNameOrSelector === "string") {
            this.fieldName = fieldNameOrSelector;
        } else {
            this.fieldName = toPropertyPath(fieldNameOrSelector);
        }
        
        this._byFieldMethodUsed = true;
        return this;
    }

    targetQuantization(targetEmbeddingQuantization: VectorEmbeddingType): IVectorEmbeddingField & IVectorEmbeddingTextField {
        // PortableExceptions.ThrowIf<Error>(
        //     this._byFieldMethodUsed,
        //     `Cannot use method targetQuantization with withField since quantization is already done by the index.`
        // );

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

        this.fieldName = this.getFormattedFieldName(this.fieldName)
        return this;
    }

    // TODO - Implement this method
    // usingTask(embeddingsGenerationTaskIdentifier: string): IVectorEmbeddingTextField {
    //     this.embeddingsGenerationTaskIdentifier = embeddingsGenerationTaskIdentifier;
    //     return this;
    // }
}
