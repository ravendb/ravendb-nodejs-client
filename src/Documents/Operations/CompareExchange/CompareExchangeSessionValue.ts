import { CompareExchangeValue } from "./CompareExchangeValue";
import { ICompareExchangeValue } from "./ICompareExchangeValue";
import { CompareExchangeValueState } from "./CompareExchangeValueState";
import { throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { ClassConstructor } from "../../../Types";
import {
    DeleteCompareExchangeCommandData,
    DocumentConventions, EntityToJson,
    ICommandData, IMetadataDictionary,
    PutCompareExchangeCommandData, TypesAwareObjectMapper
} from "../../..";
import { CompareExchangeValueJsonConverter } from "./CompareExchangeValueJsonConverter";
import { COMPARE_EXCHANGE, CONSTANTS } from "../../../Constants";
import { StringUtil } from "../../../Utility/StringUtil";

export class CompareExchangeSessionValue {
    private readonly _key: string;
    private _index: number;
    private _originalValue: CompareExchangeValue<object>;

    private _value: ICompareExchangeValue;
    private _state: CompareExchangeValueState;

    public constructor(key: string, index: number, state: CompareExchangeValueState);
    public constructor(value: CompareExchangeValue<any>);
    public constructor(keyOrValue: string | CompareExchangeValue<object>, index?: number, state?: CompareExchangeValueState) {
        if (!keyOrValue) {
            throwError("InvalidArgumentException", "Key cannot be null");
        }

        if (TypeUtil.isString(keyOrValue)) {
            this._key = keyOrValue;
            this._index = index;
            this._state = state;
        } else {
            this._key = keyOrValue.key;
            this._index = keyOrValue.index;
            this._state = keyOrValue.index >= 0 ? "None" : "Missing";

            if (keyOrValue.index > 0) {
                this._originalValue = keyOrValue;
            }
        }
    }

    public getValue<T>(clazz: ClassConstructor<T>, conventions: DocumentConventions): CompareExchangeValue<T> {
        switch (this._state) {
            case "None":
            case "Created":
                if (this._value instanceof CompareExchangeValue) {
                    return this._value;
                }

                if (this._value) {
                    throwError("InvalidOperationException", "Value cannot be null");
                }

                let entity: T;

                if (this._originalValue && !TypeUtil.isNullOrUndefined(this._originalValue.value)) {
                    if (TypeUtil.isPrimitive(clazz)) {
                        entity = this._originalValue.value[COMPARE_EXCHANGE.OBJECT_FIELD_NAME];
                    } else {
                        entity = EntityToJson.convertToEntity(clazz, this._key, this._originalValue.value, conventions);
                    }
                }

                const value = new CompareExchangeValue(this._key, this._index, entity);
                this._value = value;

                return value;
            case "Missing":
            case "Deleted":
                return null;
            default:
                throwError("NotSupportedException", "Not supported state: " + this._state);

        }
    }

    public create<T>(item: T): CompareExchangeValue<T> {
        this._assertState();

        if (this._value) {
            throwError("InvalidOperationException", "The compare exchange value with key '" + this._key + "' is already tracked.");
        }

        this._index = 0;
        const value = new CompareExchangeValue(this._key, this._index, item);
        this._value = value;
        this._state = "Created";
        return value;
    }

    public delete(index: number) {
        this._assertState();

        this._index = index;
        this._state = "Deleted";
    }

    private _assertState() {
        switch (this._state) {
            case "None":
            case "Missing":
                return;
            case "Created":
                throwError("InvalidOperationException", "The compare exchange value with key '" + this._key + "' was already stored.");
            case "Deleted":
                throwError("InvalidOperationException", "The compare exchange value with key '" + this._key + "' was already deleted.");
        }
    }

    public getCommand(conventions: DocumentConventions): ICommandData {
        switch (this._state) {
            case "None":
            case "Created":
                if (!this._value) {
                    return null;
                }

                const entity = CompareExchangeValueJsonConverter.convertToJson(this._value.value, conventions);

                let entityJson = TypeUtil.isObject(entity) ? entity : null;
                let metadata: any;

                if (this._value.hasMetadata() && Object.keys(this._value.metadata)) {
                    metadata = CompareExchangeSessionValue.prepareMetadataForPut(this._key, this._value.metadata, conventions);
                }

                let entityToInsert = null;
                if (TypeUtil.isNullOrUndefined(entityJson)) {
                    entityJson = entityToInsert = this._convertEntity(this._key, entity, conventions.objectMapper, metadata);
                }

                const newValue = new CompareExchangeValue(this._key, this._index, entityJson);
                const hasChanged = TypeUtil.isNullOrUndefined(this._originalValue) || this.hasChanged(this._originalValue, newValue);

                this._originalValue = newValue;

                if (!hasChanged) {
                    return null;
                }

                if (TypeUtil.isNullOrUndefined(entityToInsert)) {
                    entityToInsert = this._convertEntity(this._key, entity, conventions.objectMapper, metadata);
                }

                return new PutCompareExchangeCommandData(newValue.key, entityToInsert, newValue.index);
            case "Deleted":
                return new DeleteCompareExchangeCommandData(this._key, this._index);
            case "Missing":
                return null;
            default:
                throwError("InvalidOperationException", "Not supported state: " + this._state);
        }
    }

    private _convertEntity(key: string, entity: any, objectMapper: TypesAwareObjectMapper, metadata: any) { //TODO: write test for cmp exch with string/boolean/int types
        return {
            [COMPARE_EXCHANGE.OBJECT_FIELD_NAME]: entity,
            metadata: metadata ?? undefined
        }
    }

    public hasChanged(originalValue: CompareExchangeValue<unknown>, newValue: CompareExchangeValue<unknown>) {
        if (originalValue === newValue) {
            return false;
        }

        if (!StringUtil.equalsIgnoreCase(originalValue.key, newValue.key)) {
            throwError("InvalidOperationException", "Keys do not match. Expected '" + originalValue.key + " but was: " + newValue.key);
        }

        if (originalValue.index !== newValue.index) {
            return true;
        }

        return JSON.stringify(originalValue.value) !== JSON.stringify(newValue.value);
    }

    public updateState(index: number) {
        this._index = index;
        this._state = "None";

        if (this._originalValue) {
            this._originalValue.index = index;
        }

        if (this._value) {
            this._value.index = index;
        }
    }

    public updateValue(value: CompareExchangeValue<object>, mapper: TypesAwareObjectMapper) {
        this._index = value.index;
        this._state = value.index >= 0 ? "None" : "Missing";

        this._originalValue = value;

        if (this._value) {
            this._value.index = this._index;

            if (!TypeUtil.isNullOrUndefined(this._value.value)) {
                EntityToJson.populateEntity(this._value.value, value.value, mapper);
            }
        }
    }

    public static prepareMetadataForPut(key: string, metadataDictionary: IMetadataDictionary, conventions: DocumentConventions) {
        if (CONSTANTS.Documents.Metadata.EXPIRES in metadataDictionary) {
            const obj = metadataDictionary[CONSTANTS.Documents.Metadata.EXPIRES];
            if (!obj) {
                CompareExchangeSessionValue._throwInvalidExpiresMetadata(
                    "The value of " + CONSTANTS.Documents.Metadata.EXPIRES + " metadata for compare exchange '" + key + " is null.");
            }

            if (!(obj instanceof Date) && !(obj instanceof String)) {
                CompareExchangeSessionValue._throwInvalidExpiresMetadata("The class of " + CONSTANTS.Documents.Metadata.EXPIRES + " metadata for compare exchange '" + key + "' is not valid. Use the following type: Date or string");
            }
        }

        return conventions.objectMapper.toObjectLiteral(metadataDictionary);
    }

    private static _throwInvalidExpiresMetadata(message: string) {
        throwError("InvalidArgumentException", message);
    }
}

