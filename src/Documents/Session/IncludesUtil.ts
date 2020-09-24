import { StringUtil } from "../../Utility/StringUtil";

export class IncludesUtil {

    public static include(
        document: object, include: string, loadId: (id: string) => void): void {
        if (!include || !document) {
            return;
        }

        // TBD:
    }

    /* TBD
     public static void Include(BlittableJsonReaderObject document, string include, Action<string> loadId)
        {
            if (string.IsNullOrEmpty(include) || document == null)
                return;
            var path = GetIncludePath(include, out var isPrefix);

            foreach (var token in document.SelectTokenWithRavenSyntaxReturningFlatStructure(path.Path))
            {
                ExecuteInternal(token.Item1, path.Addition, (value, addition) =>
                {
                    value = addition != null
                        ? (isPrefix ? addition + value : string.Format(addition, value))
                        : value;

                    loadId(value);
                });
            }
        }
     */

    public static requiresQuotes(include: string, escapedIncludeSetter: (value: string) => void): boolean {
        for (let i = 0; i < include.length; i++) {
            const ch = include.charAt(i);
            if (!(StringUtil.isLetter(ch) || StringUtil.isDigit(ch)) && ch !== "_" && ch !== ".") {
                escapedIncludeSetter(include.replace(/'/g, "\'"));
                return true;
            }
        }

        escapedIncludeSetter(null);
        return false;
    }
}
