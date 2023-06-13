import { QueryToken } from "./QueryToken";
import { throwError } from "../../../Exceptions";
import { StringUtil } from "../../../Utility/StringUtil";

export class SuggestToken extends QueryToken {

    private readonly _fieldName: string;
    private readonly _alias: string;
    private readonly _termParameterName: string;
    private readonly _optionsParameterName: string;

    private constructor(fieldName: string, alias: string, termParameterName: string, optionsParameterName: string) {
        super();

        if (!fieldName) {
            throwError("InvalidArgumentException", "fieldName cannot be null");
        }

        if (!termParameterName) {
            throwError("InvalidArgumentException", "termParameterName cannot be null");
        }

        this._fieldName = fieldName;
        this._alias = alias.includes(" ") ? `"${alias}"` : alias;
        this._termParameterName = termParameterName;
        this._optionsParameterName = optionsParameterName;
    }

    public static create(fieldName: string, alias: string, termParameterName: string, optionsParameterName: string) {
        return new SuggestToken(fieldName, alias, termParameterName, optionsParameterName);
    }

    public get fieldName() {
        return this._fieldName;
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

        if (StringUtil.isNullOrWhitespace(this._alias) || this.fieldName === this._alias) {
            return;
        }

        writer
            .append(" as ")
            .append(this._alias);
    }
}
