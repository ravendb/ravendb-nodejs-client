import { CONSTANTS } from "../../Constants";
import { StringUtil } from "../../Utility/StringUtil";
import * as StringBuilder from "string-builder";

export class QueryFieldUtil {

    private static shouldEscape(s: string, isPath = false): boolean {
        let escape = false;
        let insideEscaped = false;

        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);

            if (c === "'" || c === "\"") {
                insideEscaped = !insideEscaped;
                continue;
            }

            if (i === 0) {
                if (!StringUtil.isLetter(c) && c !== "_" && c !== "@" && !insideEscaped) {
                    escape = true;
                    break;
                }
            } else {
                if (!StringUtil.isLetterOrDigit(c) && c !== "_" && c !== "-" && c !== "@" && c !== "." && c !== "[" && c !== "]" && !insideEscaped) {
                    escape = true;
                    break;
                }
                if (isPath && c === "." && !insideEscaped) {
                    escape = true;
                    break;
                }
            }
        }

        escape = escape || insideEscaped;
        return escape;
    }

    public static escapeIfNecessary(name: string, isPath: boolean = false): string {
        if (!name ||
            CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.REDUCE_KEY_HASH_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.REDUCE_KEY_KEY_VALUE_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.SPATIAL_SHAPE_FIELD_NAME === name) {
            return name;
        }

        if (!QueryFieldUtil.shouldEscape(name, isPath)) {
            return name;
        }

        const sb = new StringBuilder();
        sb.append(name);

        }

        return name;
    }
}
