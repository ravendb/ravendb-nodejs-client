import { QueryToken } from "./QueryToken";
import { throwError } from "../../../Exceptions";
import { StringBuilder } from "../../../Utility/StringBuilder";

export class CompareExchangeValueIncludesToken extends QueryToken {
    private readonly _path: string;

    private constructor(path: string) {
        super();

        if (!path) {
            throwError("InvalidArgumentException", "Path cannot be null");
        }

        this._path = path;
    }

    public static create(path: string) {
        return new CompareExchangeValueIncludesToken(path);
    }

    writeTo(writer: StringBuilder) {
        writer
            .append("cmpxchg('")
            .append(this._path)
            .append("')");
    }
}
