import { IVectorField } from "../../../Session/IVectorFieldFactory.js";
import { VectorFieldBase } from "../Common/VectorFieldBase.js";
import { Field } from "../../../../Types/index.js";

export class VectorField<T> extends VectorFieldBase<T> implements IVectorField {
    constructor(fieldName: Field<T>) {
        super(fieldName);
        this._byFieldMethodUsed = true;
        this.fieldName = fieldName;
    }
}
