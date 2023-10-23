import { IGroupByDocumentQuery } from "./IGroupByDocumentQuery";
import { DocumentQuery } from "./DocumentQuery";
import { GroupByField } from "./GroupByField";
import { throwError } from "../../Exceptions";
import { IDocumentQuery } from "./IDocumentQuery";
import { IFilterFactory } from "../Queries/IFilterFactory";
import { FilterFactory } from "../Queries/FilterFactory";

export class GroupByDocumentQuery<T extends object> implements IGroupByDocumentQuery<T> {

    private readonly _query: DocumentQuery<T>;

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

    public filter(builder: (factory: IFilterFactory<T>) => void, limit?: number): IGroupByDocumentQuery<T> {
        limit ??= Number.MAX_SAFE_INTEGER;
        const mode = this._query.setFilterMode(true);
        try {
            const f = new FilterFactory(this._query, limit);
            builder(f);
        } finally {
            mode.dispose();
        }

        return this;
    }
}
