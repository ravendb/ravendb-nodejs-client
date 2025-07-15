import { IVectorField } from "../../../Session/VectorFieldFactory.js";
import { Field } from "../../../../Types/index.js";

export class VectorField<T> implements IVectorField {
    public fieldName: string;

    constructor(fieldName: Field<T>) {
        this.fieldName = fieldName;
    }
}
