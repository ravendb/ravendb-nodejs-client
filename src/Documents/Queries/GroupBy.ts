import {GroupByMethod} from "./GroupByMethod";
export class GroupBy {

    private _field: string;
    private _method: GroupByMethod;

    private constructor() {
        // empty
    }

    public get field(): string {
        return this._field;
    }

    public get method(): GroupByMethod {
        return this._method;
    }

    public static field(fieldName: string): GroupBy {
        const groupBy = new GroupBy();
        groupBy._field = fieldName;
        groupBy._method = "None";

        return groupBy;
    }

    public static array(fieldName: string) {
        const groupBy = new GroupBy();
        groupBy._field = fieldName;
        groupBy._method = "Array";
        return groupBy;

    }
}
