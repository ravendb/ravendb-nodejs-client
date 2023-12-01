import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { CompareExchangeValue } from "./CompareExchangeValue";
import { throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { ObjectUtil } from "../../../Utility/ObjectUtil";
import { CONSTANTS } from "../../../Constants";
import { MetadataAsDictionary, MetadataDictionary } from "../../../Mapping/MetadataAsDictionary";
import { CompareExchangeResultClass, EntityConstructor } from "../../../Types";

export interface CompareExchangeResultItem {
    index: number;
    key: string;
    value: { object: object, "@metadata"?: any };
    changeVector: string;
}

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
        return values[itemsKeys[0]];
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

        let rawValue = raw.object;
        if (clazz && TypeUtil.isPrimitiveType(clazz) || TypeUtil.isPrimitive(rawValue)) {
            return new CompareExchangeValue(key, index, rawValue, cv, metadata);
        } else {
            if (!rawValue) {
                return new CompareExchangeValue(key, index, null, cv, metadata);
            } else {
                const entityType = conventions.getJsTypeByDocumentType(clazz as EntityConstructor);
                if (conventions.entityFieldNameConvention) {
                    rawValue = ObjectUtil.transformObjectKeys(
                        rawValue, {
                            defaultTransform: conventions.entityFieldNameConvention,
                            recursive: true,
                            arrayRecursive: true
                        });
                }
                const entity = conventions.deserializeEntityFromJson(entityType, rawValue);
                return new CompareExchangeValue(key, index, entity, cv, metadata);
            }
        }
    }
}
