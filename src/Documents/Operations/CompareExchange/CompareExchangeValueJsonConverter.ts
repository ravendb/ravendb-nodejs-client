import { DocumentConventions, EntityToJson } from "../../..";
import { TypeUtil } from "../../../Utility/TypeUtil";

export class CompareExchangeValueJsonConverter {
    public static convertToJson(value: object, conventions: DocumentConventions) {
        if (!value) {
            return null;
        }

        if (TypeUtil.isPrimitive(value)) {
            return value;
        }

        return EntityToJson.convertEntityToJson(value, conventions);
    }
}
