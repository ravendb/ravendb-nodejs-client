import { QueryToken } from "./QueryToken";

export class GroupByKeyToken extends QueryToken {

    private _fieldName: string;
    private _projectedName: string;

    private constructor(fieldName: string, projectedName: string) {
        super();
        this._fieldName = fieldName;
        this._projectedName = projectedName;
    }

    public static create(fieldName: string, projectedName: string): GroupByKeyToken {
        return new GroupByKeyToken(fieldName, projectedName);
    }

    public writeTo(writer): void {
        this._writeField(writer, this._fieldName || "key()");

        if (this._projectedName || this._projectedName === this._fieldName) {
            return;
        }

        writer
                .append(" as ")
                .append(this._projectedName);
    }
}
