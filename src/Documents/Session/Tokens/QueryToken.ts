import { StringBuilder } from "../../../Utility/StringBuilder";

export abstract class QueryToken {

    public abstract writeTo(writer: StringBuilder);

    public static writeField(writer: StringBuilder, field: string) {
        const keyWord = QueryToken.isKeyword(field);
        if (keyWord) {
            writer.append("'");
        }
        writer.append(field);

        if (keyWord) {
            writer.append("'");
        }
    }

    public static isKeyword(field: string): boolean {
        return QueryToken.RQL_KEYWORDS.has(field);
    }

    private static RQL_KEYWORDS: Set<string> = new Set([
        "as",
        "select",
        "where",
        "load",
        "group",
        "order",
        "include",
    ]);
}
