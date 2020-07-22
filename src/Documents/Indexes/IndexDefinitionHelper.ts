import { IndexType } from "./Enums";
import { throwError } from "../../Exceptions/index";
import { StringUtil } from "../../Utility/StringUtil";

export class IndexDefinitionHelper {
    public static detectStaticIndexType(map: string, reduce: string): IndexType {
        if (!map) {
            throwError("InvalidArgumentException", "Index definitions contains no Maps");
        }

        //TODO:  map = map.replaceAll("(?:/\\*(?:[^*]|(?:\\*+[^*/]))*\\*+/)|(?://.*)","");
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
