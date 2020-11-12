import { IndexType } from "./Enums";
import { throwError } from "../../Exceptions/index";
import { StringUtil } from "../../Utility/StringUtil";
import * as XRegExp from "xregexp";
import { IndexSourceType } from "./IndexSourceType";

const COMMENT_REGEX = new XRegExp("(?:/\\*(?:[^*]|(?:\\*+[^*/]))*\\*+/)|(?://.*)", "gm");

export class IndexDefinitionHelper {
    public static detectStaticIndexType(map: string, reduce: string): IndexType {
        if (!map) {
            throwError("InvalidArgumentException", "Index definitions contains no Maps");
        }

        map = IndexDefinitionHelper.stripComments(map);
        map = IndexDefinitionHelper.unifyWhiteSpace(map);

        const mapLower = map.toLocaleLowerCase();

        if (mapLower.startsWith("from")
            || mapLower.startsWith("docs")
            || mapLower.startsWith("timeseries")
            || mapLower.startsWith("counters")) {
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

    public static detectStaticIndexSourceType(map: string): IndexSourceType {
        if (StringUtil.isNullOrWhitespace(map)) {
            throwError("InvalidArgumentException", "Value cannot be null or whitespace.");
        }

        map = IndexDefinitionHelper.stripComments(map);
        map = IndexDefinitionHelper.unifyWhiteSpace(map);

        // detect first supported syntax: timeseries.Companies.HeartRate.Where
        const mapLower = map.toLocaleLowerCase();
        if (mapLower.startsWith("timeseries")) {
            return "TimeSeries";
        }

        if (mapLower.startsWith("counters")) {
            return "Counters";
        }

        if (mapLower.startsWith("from")) {
            // detect `from ts in timeseries` or `from ts in timeseries.Users.HeartRate`

            const tokens = mapLower.split(" ", 4)
                .filter(x => !StringUtil.isNullOrEmpty(x));

            if (tokens.length >= 4 && "in" === tokens[2].toLocaleLowerCase()) {
                if (tokens[3].startsWith("timeseries")) {
                    return "TimeSeries";
                }
                if (tokens[3].startsWith("counters")) {
                    return "Counters";
                }
            }
        }

        // fallback to documents based index
        return "Documents";
    }

    private static stripComments(input: string): string {
        return input.replace(COMMENT_REGEX, "").trim();
    }

    private static unifyWhiteSpace(input: string): string {
        return input.replace(/(\s+)/g, " ");
    }
}
