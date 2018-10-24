import { QueryToken } from "./QueryToken";
import * as StringBuilder from "string-builder";

export class ExplanationToken extends QueryToken {
    private readonly _optionsParameterName: string;

    private constructor(optionsParameterName: string) {
        super();
        this._optionsParameterName = optionsParameterName;
    }

    public static create(optionsParameterName: string): ExplanationToken {
        return new ExplanationToken(optionsParameterName);
    }

    public writeTo(writer: StringBuilder): void {
        writer.append("explanations(");
        if (this._optionsParameterName) {
            writer
                .append("$")
                .append(this._optionsParameterName);
        }

        writer.append(")");
    }
}
