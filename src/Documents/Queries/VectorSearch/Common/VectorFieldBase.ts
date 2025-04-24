import {VectorEmbeddingType} from "../VectorEmbeddingType.js";
import { Field } from "../../../../Types/index.js";

type PartialRecord<K extends keyof any, T> = {
    [P in K]?: T;
};

export abstract class VectorFieldBase<T> {
    public rawFieldName: Field<T>;
    public fieldName: string;
    protected _byFieldMethodUsed: boolean = false;

    constructor(fieldName: Field<T>) {
        this.rawFieldName = fieldName;
        this.fieldName = fieldName as string;
    }

    protected getFormattedFieldName(rawFieldName: Field<T>, sourceType: VectorEmbeddingType,
                                   destType: VectorEmbeddingType,
                                   taskIdentifier?: string): string {
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
            return rawFieldName;
        }

        const embeddingFunction = configurationMap[sourceType]?.[destType];
        if (!embeddingFunction) {
            return rawFieldName;
        }

        // For text source type with task identifier, handle specially
        if (sourceType === "Text" && taskIdentifier) {
            return embeddingFunction ?
                `${embeddingFunction}(${rawFieldName}, ai.task('${taskIdentifier}'))` :
                rawFieldName;
        }

        // For empty embedding function (same source and destination for Single), return just the field name
        if (embeddingFunction === "") {
            return rawFieldName;
        }

        return `${embeddingFunction}(${rawFieldName})`;
    }
}
