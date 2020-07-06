import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { CompareExchangeValue } from "./CompareExchangeValue";
import { throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { ObjectUtil } from "../../../Utility/ObjectUtil";
import { ClassConstructor } from "../../../Types";

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

            const key = item.key || throwError("InvalidOperationException", "Response is invalid. Key is missing.");

            const index = item.index;
            if (TypeUtil.isNullOrUndefined(index)) {
                throwError("InvalidOperationException", `Response is invalid. Index is ${item.index}.`);
            }

            const raw = item.value;
            if (TypeUtil.isNullOrUndefined(raw)) {
                throwError("InvalidOperationException", "Response is invalid. Value is missing.");
            }

            let rawValue = raw.object;
            if (TypeUtil.isPrimitiveType(clazz) || !clazz) {
                results[key] = new CompareExchangeValue(key, index, rawValue);
            } else {
                if (!rawValue) {
                    results[key] = new CompareExchangeValue(key, index, null);
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
                    results[key] = new CompareExchangeValue(key, index, entity);
                }
            }
        }

        return results;
    }

    public static getValue<T>(
        response: GetCompareExchangeValuesResponse,
        conventions: DocumentConventions,
        clazz: ClassConstructor<T>): CompareExchangeValue<T> {
        if (!response) {
            return null;
        }

        const values = CompareExchangeValueResultParser.getValues(response, conventions, clazz);
        const itemsKeys = Object.keys(values);
        if (!values || !itemsKeys.length) {
            return null;
        }
        return values[itemsKeys[0]];
    }
}
