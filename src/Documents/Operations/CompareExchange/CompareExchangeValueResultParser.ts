import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { CompareExchangeValue } from "./CompareExchangeValue";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";
import { throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { ClassConstructor } from "../../..";

export class CompareExchangeValueResultParser {

    public static getValues<T>(
        response: string, 
        conventions: DocumentConventions, 
        clazz?: ClassConstructor<T>)
        : { [key: string]: CompareExchangeValue<T> } {

        const jsonResponse = JsonSerializer.getDefault().deserialize(response);
        const results = {};

        const items = jsonResponse["Results"];
        if (!items) {
            throwError("InvalidOperationException", "Response is invalid. Results is missing.");
        }

        for (const item of items) {
            if (!item) {
                throwError("InvalidOperationException", "Response is invalid. Item is null");
            }

            const key = item["Key"];

            if (!key) {
                throwError("InvalidOperationException", "Response is invalid. Key is missing.");
            }

            const index = item["Index"];
            if (!index) {
                throwError("InvalidOperationException", "Response is invalid. Index is missing.");
            }

            const raw = item["Value"];
            if (!raw) {
                throwError("InvalidOperationException", "Response is invalid. Value is missing.");
            }


            if (TypeUtil.isPrimitiveType(clazz) || !clazz) {
                // simple
                const rawValue = raw["Object"];
                results[key] = new CompareExchangeValue(key, index, rawValue);
            } else {
                const obj = raw["Object"];
                if (!obj) {
                    results[key] = new CompareExchangeValue(key, index, null);
                } else {
                    const entityType = conventions.findEntityType(clazz);
                    const entity = conventions.deserializeEntityFromJson(entityType, obj);
                    results[key] = new CompareExchangeValue(key, index, entity);
                }
            }
        }

        return results;
    }

    public static getValue<T>(
        response: string, conventions: DocumentConventions, clazz: ClassConstructor<T>): CompareExchangeValue<T> {
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
