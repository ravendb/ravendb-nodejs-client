import { TypeUtil } from "../../../Utility/TypeUtil";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { EntityToJson } from "../../Session/EntityToJson";

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
