import { IndexType } from "./Enums";
import { throwError } from "../../Exceptions/index";
import { StringUtil } from "../../Utility/StringUtil";
import * as XRegExp from "xregexp";

const COMMENT_REGEX = new XRegExp("(?:/\\*(?:[^*]|(?:\\*+[^*/]))*\\*+/)|(?://.*)", "gm");

export class IndexDefinitionHelper {
    public static detectStaticIndexType(map: string, reduce: string): IndexType {
        if (!map) {
            throwError("InvalidArgumentException", "Index definitions contains no Maps");
        }

        map = map.replace(COMMENT_REGEX, "");
        map = map.trim();

        if (map.startsWith("from") || map.startsWith("docs")) {
            // C# indexes must start with "from" for query syntax or
            // "docs" for method syntax
            if (StringUtil.isNullOrWhitespace(reduce)) {
                return "Map";
            }
            return "MapReduce";
        }

        if (StringUtil.isNullOrWhitespace(reduce)) {
            return "JavaScriptMap";
        }

        return "JavaScriptMapReduce";
    }
}
