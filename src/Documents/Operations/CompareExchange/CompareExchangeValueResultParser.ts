import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { CompareExchangeValue } from "./CompareExchangeValue";
import { throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { ObjectUtil } from "../../../Utility/ObjectUtil";
import { ClassConstructor } from "../../../Types";
import { CONSTANTS } from "../../../Constants";
import { MetadataAsDictionary, MetadataDictionary } from "../../../Mapping/MetadataAsDictionary";

export interface CompareExchangeResultItem {
    index: number;
    key: string;
    value: { object: object };
}

export interface GetCompareExchangeValuesResponse {
    results: CompareExchangeResultItem[];
}

export class CompareExchangeValueResultParser {

    public static getValues<T>(
        responseObj: GetCompareExchangeValuesResponse,
        materializeMetadata: boolean,
        conventions: DocumentConventions,
        clazz?: ClassConstructor<T>)
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
        clazz: ClassConstructor<T>): CompareExchangeValue<T> {
        if (!response) {
            return null;
        }

        const values = CompareExchangeValueResultParser.getValues(response, materializeMetadata, conventions, clazz);
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
        clazz: ClassConstructor<T>) {

        if (!item) {
            return null;
        }

        const key = item.key || throwError("InvalidOperationException", "Response is invalid. Key is missing.");

        const index = item.index;
        if (TypeUtil.isNullOrUndefined(index)) {
            throwError("InvalidOperationException", `Response is invalid. Index is ${item.index}.`);
        }

        const raw = item.value;

        if (TypeUtil.isNullOrUndefined(raw)) {
            return new CompareExchangeValue(key, index, null);
        }

        let metadata: MetadataAsDictionary;
        const metadataRaw = raw[CONSTANTS.Documents.Metadata.KEY];
        if (metadataRaw && TypeUtil.isObject(metadataRaw)) {
            metadata = !materializeMetadata ? MetadataDictionary.create(metadataRaw) : MetadataDictionary.materializeFromJson(metadataRaw);
        }

        let rawValue = raw.object;
        if (TypeUtil.isPrimitiveType(clazz) || !clazz) {
            return new CompareExchangeValue(key, index, rawValue, metadata);
        } else {
            if (!rawValue) {
                return new CompareExchangeValue(key, index, null, metadata);
            } else {
                const entityType = conventions.getJsTypeByDocumentType(clazz);
                if (conventions.entityFieldNameConvention) {
                    rawValue = ObjectUtil.transformObjectKeys(
                        rawValue, {
                            defaultTransform: conventions.entityFieldNameConvention,
                            recursive: true,
                            arrayRecursive: true
                        });
                }
                const entity = conventions.deserializeEntityFromJson(entityType, rawValue);
                return new CompareExchangeValue(key, index, entity, metadata);
            }
        }
    }
}
