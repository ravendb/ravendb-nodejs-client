export class DocumentsChanges {

    public fieldOldValue: any;
    public fieldNewValue: any;
    public fieldOldType: string;
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
