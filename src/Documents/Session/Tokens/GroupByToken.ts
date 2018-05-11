import { QueryToken } from "./QueryToken";
import { GroupByMethod } from "../../Queries/GroupByMethod";

export class GroupByToken extends QueryToken {

    private _fieldName: string;
    private _method: GroupByMethod;

    private constructor(fieldName: string, method: GroupByMethod) {
        super();
        this._fieldName = fieldName;
        this._method = method;
    }

    public static create(fieldName: string): GroupByToken;
    public static create(fieldName: string, method: GroupByMethod): GroupByToken;
    public static create(fieldName: string, method: GroupByMethod = "NONE"): GroupByToken {
        return new GroupByToken(fieldName, method);
    }

    public writeTo(writer): void {
        if (this._method !== "NONE") {
            writer.append("Array(");
        }
        this.writeField(writer, this._fieldName);
        if (this._method !== "NONE") {
            writer.append(")");
        }
    }
}
