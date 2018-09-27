import {TypeUtil} from "../Utility/TypeUtil";
import {DocumentInfo} from "../Documents/Session/DocumentInfo";
import { DocumentsChanges, ChangeType } from "../Documents/Session/DocumentsChanges";
import { CONSTANTS } from "../Constants";
import { throwError } from "../Exceptions";

export class JsonOperation {

    public static entityChanged(
        newObj: object, 
        documentInfo: DocumentInfo, 
        changes: { [id: string]: DocumentsChanges[] }): boolean {

        const docChanges: DocumentsChanges[] = changes ? [] : null;

        if (!documentInfo.newDocument && documentInfo.document) {
            return JsonOperation._compareJson(documentInfo.id, documentInfo.document, newObj, changes, docChanges);
        }

        if (!changes) {
            return true;
        }

        JsonOperation._newChange(null, null, null, docChanges, "DocumentAdded");
        changes[documentInfo.id] = docChanges;
        return true;
    }

    private static _compareJson(
        id: string, 
        originalJson: object, 
        newJson: object, 
        changes: { [id: string]: DocumentsChanges[] }, 
        docChanges: DocumentsChanges[]): boolean {
        const newJsonProps: string[] = Object.keys(newJson);
        const oldJsonProps: string[] = Object.keys(originalJson);

        const newFields = newJsonProps.filter(x => !oldJsonProps.find(y => y === x));
        const removedFields = oldJsonProps.filter(x => !newJsonProps.find(y => y === x));

        for (const field of removedFields) {
            if (!changes) {
                return true;
            }

            JsonOperation._newChange(field, null, null, docChanges, "RemovedField");
        }

        for (const prop of newJsonProps) {

            if (CONSTANTS.Documents.Metadata.LAST_MODIFIED === prop ||
                    CONSTANTS.Documents.Metadata.COLLECTION === prop ||
                    CONSTANTS.Documents.Metadata.CHANGE_VECTOR === prop ||
                    CONSTANTS.Documents.Metadata.ID === prop ||
                    CONSTANTS.Documents.Metadata.KEY === prop) {
                continue;
            }

            if (newFields.find(x => x === prop)) {
                if (!changes) {
                    return true;
                }

                JsonOperation._newChange(prop, newJson[prop], null, docChanges, "NewField");
                continue;
            }

            const newProp = newJson[prop];
            const oldProp = originalJson[prop];

            let changed: boolean;
            const typeOfNewProp = typeof newProp;
            if (typeOfNewProp === "number"
                || typeOfNewProp === "boolean"
                || typeOfNewProp === "string") {

                if (newProp === oldProp || JsonOperation._compareValues(oldProp, newProp)) {
                    continue;
                }
                if (!changes) {
                    return true;
                }

                JsonOperation._newChange(prop, newProp, oldProp, docChanges, "FieldChanged");
            } else if (!newProp) {
                if (oldProp) {
                    if (!changes) {
                        return true;
                    }

                    JsonOperation._newChange(prop, null, oldProp, docChanges, "FieldChanged");
                }
            } else if (Array.isArray(newProp)) {
                if (!oldProp || !Array.isArray(oldProp)) {
                    if (!changes) {
                        return true;
                    }

                    JsonOperation._newChange(prop, newProp, oldProp, docChanges, "FieldChanged");
                }

                changed = JsonOperation._compareJsonArray(
                    id, oldProp as any[], newProp as any[], changes, docChanges, prop);
                if (!changes && changed) {
                    return true;
                }
            } else if (TypeUtil.isObject(newProp)) {
                    if (!oldProp) {
                        if (!changes) {
                            return true;
                        }

                        JsonOperation._newChange(prop, newProp, null, docChanges, "FieldChanged");
                    } else {
                        changed = JsonOperation._compareJson(
                            id, oldProp as object, newProp as object, changes, docChanges);

                        if (!changes && changed) {
                            return true;
                        }
                    }
            } else {
                throwError("InvalidArgumentException", `Unknown type of JSON property: ${typeOfNewProp}.`);
            }
        }

        if (!changes || docChanges.length <= 0) {
            return false;
        }

        changes[id] = docChanges;
        return true;
    }

    private static _compareValues(oldProp: string | boolean | number, newProp): boolean {
        return oldProp === newProp; // triple equals compares type as well
    }

    private static _compareJsonArray(
        id: string, 
        oldArray: any[], 
        newArray: any[], 
        changes: { [id: string]: DocumentsChanges[] }, 
        docChanges: DocumentsChanges[], 
        propName: string): boolean {
        // if we don't care about the changes
        if (oldArray.length !== newArray.length && !changes) {
            return true;
        }

        let position = 0;
        let changed: boolean = false;

        let oldArrayItem = oldArray[position];
        let typeOfOldArrayItem = typeof oldArrayItem;
        let newArrayItem = newArray[position];
        let typeOfNewArrayItem = typeof newArrayItem;

        while (position < oldArray.length && position < newArray.length) {
            if (TypeUtil.isObject(oldArrayItem)) {
                if (TypeUtil.isObject(newArrayItem)) {
                    changed = changed || this._compareJson(id, oldArrayItem, newArrayItem, changes, docChanges);
                } else {
                    changed = true;
                    if (changes) {
                        this._newChange(propName, newArrayItem, oldArrayItem, docChanges, "ArrayValueAdded");
                    }
                }
            } else if (Array.isArray(oldArrayItem)) {
                if (Array.isArray(newArrayItem)) {
                    changed = changed 
                        || this._compareJsonArray(id, oldArrayItem, newArrayItem, changes, docChanges, propName);
                } else {
                    changed = true;
                    if (changes) {
                        this._newChange(propName, newArrayItem, oldArrayItem, docChanges, "ArrayValueChanged");
                    }
                }
            } else if (!oldArrayItem) {
                if (newArrayItem) {
                    changed = true;
                    if (changes) {
                        this._newChange(
                            propName, newArrayItem, oldArrayItem, docChanges, "ArrayValueAdded");
                    }
                }
            } else {
                if (oldArrayItem !== newArrayItem) {
                    if (changes) {
                        this._newChange(
                            propName, newArrayItem, oldArrayItem, docChanges, "ArrayValueChanged");
                    }

                    changed = true;
                }
            }

            position++;
            oldArrayItem = oldArray[position];
            typeOfOldArrayItem = typeof oldArrayItem;
            newArrayItem = newArray[position];
            typeOfNewArrayItem = typeof newArrayItem;
        }

        if (!changes) {
            return changed;
        }

        // if one of the arrays is larger than the other
        while (position < oldArray.length) {
            this._newChange(propName, null, oldArray[position], docChanges, "ArrayValueRemoved");
            position++;
        }

        while (position < newArray.length) {
            this._newChange(propName, newArray[position], null, docChanges, "ArrayValueAdded");
            position++;
        }

        return changed;
    }

    private static _newChange(
        name: string, newValue: any, oldValue: any, docChanges: DocumentsChanges[], change: ChangeType): void {
        const documentsChanges = new DocumentsChanges();
        documentsChanges.fieldName = name;
        documentsChanges.fieldNewValue = newValue;
        documentsChanges.fieldOldValue = oldValue;
        documentsChanges.change = change;
        docChanges.push(documentsChanges);
    }
}
