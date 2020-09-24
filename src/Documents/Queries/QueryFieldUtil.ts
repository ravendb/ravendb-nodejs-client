import { CONSTANTS } from "../../Constants";
import { StringUtil } from "../../Utility/StringUtil";

export class QueryFieldUtil {

    public static escapeIfNecessary(name: string, isPath: boolean = false): string {
        if (!name ||
            CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.REDUCE_KEY_HASH_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.REDUCE_KEY_KEY_VALUE_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.SPATIAL_SHAPE_FIELD_NAME === name) {
            return name;
        }

        let escape = false;
        let insideEscaped = false;

        for (let i = 0; i < name.length; i++) {
            const c = name.charAt(i);

            if (c === "'" || c === "\"") {
                insideEscaped = !insideEscaped;
                continue;
            }

            if (i === 0) {
                if (!StringUtil.isLetterOrDigit(c) && c !== "_" && c !== "-" && c !== "@" && c !== "." && c !== "[" && c !== "]" && !insideEscaped) {
                    escape = true;
                    break;
                }
            } else {
                if (isPath && c === "." && !insideEscaped) {
                    escape = true;
                    break;
                }
            }
        }

        if (escape || insideEscaped) {
            return "'" + name + "'";
        }

        return name;
    }
}
