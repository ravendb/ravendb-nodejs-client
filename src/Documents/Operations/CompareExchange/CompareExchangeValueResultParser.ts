import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { CompareExchangeValue } from "./CompareExchangeValue.js";
import { throwError } from "../../../Exceptions/index.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";
import { COMPARE_EXCHANGE, CONSTANTS } from "../../../Constants.js";
import { MetadataAsDictionary, MetadataDictionary } from "../../../Mapping/MetadataAsDictionary.js";
import { CompareExchangeResultClass, EntityConstructor } from "../../../Types/index.js";

export interface CompareExchangeResultItem {
    index: number;
    key: string;
    value: { Object: object, "@metadata"?: any };
    changeVector: string;
}

export const ObjectNodeMarker = Symbol("ObjectNodeMarker");

export interface GetCompareExchangeValuesResponse {
    results: CompareExchangeResultItem[];
}

export class CompareExchangeValueResultParser {

    public static getValues<T>(
        responseObj: GetCompareExchangeValuesResponse,
        materializeMetadata: boolean,
        conventions: DocumentConventions,
        clazz?: CompareExchangeResultClass<T>)
        : { [key: string]: CompareExchangeValue<T> } {

        const items = responseObj.results;
        if (!items) {
            throwError("InvalidOperationException", "Response is invalid. Results is missing.");
        }

        const results = {};
        for (const item of items) {
            if (!item) {
                throwError("InvalidOperationException", "Response is invalid. Item is null");
            }

            const value: CompareExchangeValue<T> = CompareExchangeValueResultParser.getSingleValue(item, materializeMetadata, conventions, clazz);
            results[value.key] = value;
        }

        return results;
    }

    public static getValue<T>(
        response: GetCompareExchangeValuesResponse,
        materializeMetadata: boolean,
        conventions: DocumentConventions,
        clazz: CompareExchangeResultClass<T>): CompareExchangeValue<T> {
        if (!response) {
            return null;
        }

        const values = CompareExchangeValueResultParser.getValues<T>(response, materializeMetadata, conventions, clazz);
        const itemsKeys = Object.keys(values);
        if (!values || !itemsKeys.length) {
            return null;
        }
        return Object.values(values)[0];
    }

    public static getSingleValue<T>(
        item: CompareExchangeResultItem,
        materializeMetadata: boolean,
        conventions: DocumentConventions,
        clazz: CompareExchangeResultClass<T>) {

        if (!item) {
            return null;
        }

        const key = item.key || throwError("InvalidOperationException", "Response is invalid. Key is missing.");

        const index = item.index;
        if (TypeUtil.isNullOrUndefined(index)) {
            throwError("InvalidOperationException", `Response is invalid. Index is ${item.index}.`);
        }

        const raw = item.value;

        const cv = item.changeVector;

        if (TypeUtil.isNullOrUndefined(raw)) {
            return new CompareExchangeValue(key, index, null, cv, null);
        }

        let metadata: MetadataAsDictionary;
        const metadataRaw = raw[CONSTANTS.Documents.Metadata.KEY];
        if (metadataRaw && TypeUtil.isObject(metadataRaw)) {
            metadata = !materializeMetadata ? MetadataDictionary.create(metadataRaw) : MetadataDictionary.materializeFromJson(metadataRaw);
        }

        const value = CompareExchangeValueResultParser.deserializeObject(raw, conventions, clazz);
        return new CompareExchangeValue(key, index, value, cv, metadata);
    }

    public static deserializeObject<T>(raw: object, conventions: DocumentConventions, clazz: CompareExchangeResultClass<T>) {
        if (TypeUtil.isNullOrUndefined(raw)) {
            return null;
        }

        const rawValue = raw[COMPARE_EXCHANGE.OBJECT_FIELD_NAME];
        if (clazz && TypeUtil.isPrimitiveType(clazz)) {
            return rawValue;
        }

        if (clazz === ObjectNodeMarker) {
            if (TypeUtil.isNullOrUndefined(rawValue)) {
                return null;
            }

            return TypeUtil.isObject(rawValue) ? rawValue : raw;
        }

        if (TypeUtil.isPrimitive(rawValue)) {
            return rawValue;
        }

        if (TypeUtil.isArray(rawValue)) {
            return ObjectUtil.deepJsonClone(rawValue);
        }

        let value = (TypeUtil.isObject(raw) && COMPARE_EXCHANGE.OBJECT_FIELD_NAME in raw) ? rawValue : raw;

        const entityType = conventions.getJsTypeByDocumentType(clazz as EntityConstructor);
        if (conventions.serverToLocalFieldNameConverter) {
            value = ObjectUtil.transformObjectKeys(
                value, {
                    defaultTransform: conventions.serverToLocalFieldNameConverter,
                    recursive: true,
                    arrayRecursive: true
                });
        }

        return TypeUtil.isClass(entityType)
            ? conventions.deserializeEntityFromJson(entityType, value)
            : value;
    }
}
