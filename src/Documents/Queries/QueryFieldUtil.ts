import { CONSTANTS } from "../../Constants";
import { StringUtil } from "../../Utility/StringUtil";

export class QueryFieldUtil {

    private static _shouldEscape(s: string, isPath = false): boolean {
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
        //TODO: write / make sure we have test for this logic
        if (!name ||
            CONSTANTS.Documents.Indexing.Fields.DOCUMENT_ID_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.REDUCE_KEY_HASH_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.REDUCE_KEY_KEY_VALUE_FIELD_NAME === name ||
            CONSTANTS.Documents.Indexing.Fields.SPATIAL_SHAPE_FIELD_NAME === name) {
            return name;
        }

        if (!QueryFieldUtil._shouldEscape(name, isPath)) {
            return name;
        }

        let sb = name;

        let needEndQuote = false;
        let lastTermStart = 0;

        for (let i = 0; i < sb.length; i++) {
            const c = sb.charAt(i);
            if (i === 0 && !StringUtil.isLetter(c) && c !== "_" && c !== "@") {
                sb = StringUtil.splice(sb, lastTermStart, 0, "'");
                needEndQuote = true;
                continue;
            }

            if (isPath && c === ".") {
                if (needEndQuote) {
                    needEndQuote = false;
                    sb = StringUtil.splice(sb, i, 0, "'");
                    i++;
                }

                lastTermStart = i + 1;
                continue;
            }

            if (!StringUtil.isLetterOrDigit(c) && c !== "_" && c !== "-" && c !== "@" && c !== "." && c !== "[" && c !== "]" && !needEndQuote) {
                sb = StringUtil.splice(sb, 0, lastTermStart, "'");
                needEndQuote = true;
                continue;
            }
        }

        if (needEndQuote) {
            sb += "'";
        }

        return sb;
    }
}
