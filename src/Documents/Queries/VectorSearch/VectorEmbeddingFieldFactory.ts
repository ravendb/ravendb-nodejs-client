import {
    IVectorEmbeddingField,
    IVectorEmbeddingTextField,
    IVectorField,
    IVectorFieldFactory
} from "../../Session/VectorFieldFactory.js";
import { VectorField } from "./Fields/VectorField.js";
import { VectorEmbeddingField } from "./Fields/VectorEmbeddingField.js";
import { VectorEmbeddingTextField } from "./Fields/VectorEmbeddingTextField.js";
import { VectorEmbeddingType } from "./VectorEmbeddingType.js";
import { Field } from "../../../Types/index.js";

export class VectorEmbeddingFieldFactory<T> implements IVectorFieldFactory<T> {

    withText(fieldName: Field<T>): IVectorEmbeddingTextField {
        return new VectorEmbeddingTextField(fieldName);
    }

    withEmbedding(fieldName: Field<T>, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField {
        return new VectorEmbeddingField(fieldName, storedEmbeddingQuantization, false);
    }

    withBase64(fieldName: Field<T>, storedEmbeddingQuantization?: VectorEmbeddingType): IVectorEmbeddingField {
        return new VectorEmbeddingField(fieldName, storedEmbeddingQuantization, true);
    }

    withField(fieldName: Field<T>): IVectorField {
        return new VectorField(fieldName);
    }
}
