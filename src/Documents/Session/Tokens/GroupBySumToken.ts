import { QueryToken } from "./QueryToken";
import { throwError } from "../../../Exceptions";

export class GroupBySumToken extends QueryToken {

    private _projectedName: string;
    private _fieldName: string;

    private constructor(fieldName: string, projectedName: string) {
        super();

        if (fieldName) {
            throwError("InvalidArgumentException", "fieldName cannot be null");
        }

        this._fieldName = fieldName;
        this._projectedName = projectedName;
    }

    public static create(fieldName: string, projectedName: string): GroupBySumToken  {
        return new GroupBySumToken(fieldName, projectedName);
    }

    public writeTo(writer): void {
        writer
                .append("sum(")
                .append(this._fieldName)
                .append(")");

        if (!this._projectedName) {
            return;
        }

        writer
                .append(" as ")
                .append(this._projectedName);
    }
}
