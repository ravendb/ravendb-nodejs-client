import { IGroupByDocumentQuery } from "./IGroupByDocumentQuery";
import { DocumentQuery } from "./DocumentQuery";
import { GroupByField } from "./GroupByField";
import { throwError } from "../../Exceptions";
import { IDocumentQuery } from "./IDocumentQuery";

export class GroupByDocumentQuery<T extends object> implements IGroupByDocumentQuery<T> {

    private _query: DocumentQuery<T>;

    public constructor(query: DocumentQuery<T>) {
        this._query = query;
    }

    public selectKey(): IGroupByDocumentQuery<T>;
    public selectKey(fieldName: string): IGroupByDocumentQuery<T>;
    public selectKey(fieldName: string, projectedName: string): IGroupByDocumentQuery<T>;
    public selectKey(fieldName: string = null, projectedName: string = null): IGroupByDocumentQuery<T> {
        this._query._groupByKey(fieldName, projectedName);
        return this;
    }

    public selectSum(field: GroupByField, ...fields: GroupByField[]): IDocumentQuery<T> {
        if (!field) {
            throwError("InvalidArgumentException", "Field cannot be null");
        }

        this._query._groupBySum(field.fieldName, field.projectedName);

        if (!fields || !fields.length) {
            return this._query;
        }

        for (const f of fields) {
            this._query._groupBySum(f.fieldName, f.projectedName);
        }

        return this._query;
    }

    public selectCount(): IDocumentQuery<T>;
    public selectCount(projectedName: string): IDocumentQuery<T>;
    public selectCount(projectedName: string = "count"): IDocumentQuery<T> {
        this._query._groupByCount(projectedName);
        return this._query;
    }
}
