import { StringBuilder } from "../../../Utility/StringBuilder";

export abstract class QueryToken {

    public abstract writeTo(writer: StringBuilder);

    protected _writeField(writer: StringBuilder, field: string) {
        const keyWord = QueryToken.RQL_KEYWORDS.has(field);
        if (keyWord) {
            writer.append("'");
        }
        writer.append(field);

        if (keyWord) {
            writer.append("'");
        }
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
