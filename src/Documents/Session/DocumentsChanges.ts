export class DocumentsChanges {

    public fieldOldValue: any;
    public fieldNewValue: any;
    public fieldOldType: string;
    public fieldNewType: string;
    public change: ChangeType;
    public fieldName: string;

    public equals(o: any): boolean {
        if (this === o) {
            return true;
        }

        if (!o || this.constructor !== o.constructor) { 
            return false;
        }

        const that = o as DocumentsChanges;

        if (this.fieldOldValue ? this.fieldOldValue !== that.fieldOldValue : that.fieldOldValue) {
            return false;
        }

        if (this.fieldNewValue ? this.fieldNewValue !== that.fieldNewValue : that.fieldNewValue) {
            return false;
        }

        if (this.fieldOldType !== that.fieldOldType) { 
            return false;
        }

        if (this.fieldNewType !== that.fieldNewType) { 
            return false;
        }

        if (this.change !== that.change) { 
            return false;
        }

        return this.fieldName ? this.fieldName === that.fieldName : !that.fieldName;
    }

}

export type ChangeType =
        "DOCUMENT_DELETED"
        | "DOCUMENT_ADDED"
        | "FIELD_CHANGED"
        | "NEW_FIELD"
        | "REMOVED_FIELD"
        | "ARRAY_VALUE_CHANGED"
        | "ARRAY_VALUE_ADDED"
        | "ARRAY_VALUE_REMOVED"
        | "FIELD_TYPE_CHANGED"
        | "ENTITY_TYPE_CHANGED";