import { QueryToken } from "./QueryToken";
import { StringBuilder } from "../../../Utility/StringBuilder";

export class WithToken extends QueryToken {
    private readonly _alias: string;
    private readonly _query: string;

    public constructor(alias: string, query: string) {
        super();

        this._alias = alias;
        this._query = query;
    }

    public writeTo(writer: StringBuilder) {
        writer.append("with {");
        writer.append(this._query);
        writer.append("} as ");
        writer.append(this._alias);
    }
}