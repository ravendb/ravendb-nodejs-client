import { QueryToken } from "./QueryToken";
import { StringUtil } from "../../../Utility/StringUtil";
import { StringBuilder } from "../../../Utility/StringBuilder";

export class WithEdgesToken extends QueryToken {
    private readonly _alias: string;
    private readonly _edgeSelector: string;
    private readonly _query: string;

    public constructor(alias: string, edgeSelector: string, query: string) {
        super();

        this._alias = alias;
        this._query = query;
        this._edgeSelector = edgeSelector;
    }

    public writeTo(writer: StringBuilder) {
        writer.append("with edges(");
        writer.append(this._edgeSelector);
        writer.append(")");

        if (!StringUtil.isNullOrWhitespace(this._query)) {
            writer.append(" {");
            writer.append(this._query);
            writer.append("} ");
        }

        writer.append(" as ");
        writer.append(this._alias);
    }
}
