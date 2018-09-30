import { QueryToken } from "./QueryToken";

export class GroupByCountToken extends QueryToken {

    private readonly _fieldName: string;

    private constructor(fieldName: string) {
        super();
        this._fieldName = fieldName;
    }

    public static create(fieldName: string): GroupByCountToken {
        return new GroupByCountToken(fieldName);
    }

    public writeTo(writer): void {
        writer.append("count()");

        if (!this._fieldName) {
            return;
        }

        writer.append(" as ")
              .append(this._fieldName);
    }
}
