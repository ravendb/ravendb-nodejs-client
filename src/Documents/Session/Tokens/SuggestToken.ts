import { QueryToken } from "./QueryToken";
import { throwError } from "../../../Exceptions";

export class SuggestToken extends QueryToken {

    private readonly _fieldName: string;
    private readonly _termParameterName: string;
    private readonly _optionsParameterName: string;

    private constructor(fieldName: string, termParameterName: string, optionsParameterName: string) {
        super();

        if (!fieldName) {
            throwError("InvalidArgumentException", "fieldName cannot be null");
        }

        if (!termParameterName) {
            throwError("InvalidArgumentException", "termParameterName cannot be null");
        }

        this._fieldName = fieldName;
        this._termParameterName = termParameterName;
        this._optionsParameterName = optionsParameterName;
    }

    public static create(fieldName: string, termParameterName: string, optionsParameterName: string) {
        return new SuggestToken(fieldName, termParameterName, optionsParameterName);
    }

    public writeTo(writer): void {
        writer
            .append("suggest(")
            .append(this._fieldName)
            .append(", $")
            .append(this._termParameterName);

        if (this._optionsParameterName) {
            writer
                .append(", $")
                .append(this._optionsParameterName);
        }

        writer.append(")");
    }
}
