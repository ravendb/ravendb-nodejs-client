export class DocumentsChanges {

    public fieldOldValue: any;
    public fieldNewValue: any;

    /**
     * @deprecated FieldOldType is not supported anymore. Will be removed in next major version of the product.
     */
    public fieldOldType: string;

    /**
     * @deprecated FieldNewType is not supported anymore. Will be removed in next major version of the product.
     */
    public fieldNewType: string;
    public change: ChangeType;
    public fieldName: string;
    public fieldPath: string;

    public get fieldFullName() {
        return !this.fieldPath ? this.fieldName : this.fieldPath + "." + this.fieldName;
    }
}

export type ChangeType =
    "DocumentDeleted"
    | "DocumentAdded"
    | "FieldChanged"
    | "NewField"
    | "RemovedField"
    | "ArrayValueChanged"
    | "ArrayValueAdded"
    | "ArrayValueRemoved"
    | "FieldTypeChanged"
    | "EntityTypeChanged";
