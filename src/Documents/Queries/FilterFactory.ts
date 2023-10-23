import { IFilterFactory } from "./IFilterFactory";
import { IAbstractDocumentQuery } from "../Session/IAbstractDocumentQuery";
import { MethodCall } from "../Session/MethodCall";
import { WhereParams } from "../Session/WhereParams";
import { DocumentQuery } from "../Session/DocumentQuery";

export class FilterFactory<T extends object> implements IFilterFactory<T> {
    private _documentQuery: IAbstractDocumentQuery<T>;

    public constructor(documentQuery: IAbstractDocumentQuery<T>, filterLimit: number = Number.MAX_SAFE_INTEGER) {
        this._documentQuery = documentQuery;
        this._setFilterLimit(filterLimit);
    }


    public equals(fieldName: string, value: any): IFilterFactory<T>;
    public equals(fieldName: string, method: MethodCall): IFilterFactory<T>;
    public equals(whereParams: WhereParams): IFilterFactory<T>;
    public equals(fieldNameOrWhereParams: string | WhereParams, value?: object, exact: boolean = false): IFilterFactory<T> {
        this._documentQuery._whereEquals(fieldNameOrWhereParams as any, value, exact);
        return this;
    }

    public notEquals(fieldName: string, value: any): IFilterFactory<T>;
    public notEquals(fieldName: string, method: MethodCall): IFilterFactory<T>;
    public notEquals(whereParams: WhereParams): IFilterFactory<T>;
    public notEquals(fieldNameOrWhereParams: string | WhereParams, value?: object, exact: boolean = false): IFilterFactory<T> {
        this._documentQuery._whereNotEquals(fieldNameOrWhereParams as any, value, exact);
        return this;
    }

    public greaterThan(fieldName: string, value: any): IFilterFactory<T> {
        this._documentQuery._whereGreaterThan(fieldName, value);
        return this;
    }

    public greaterThanOrEqual(fieldName: string, value: any): IFilterFactory<T> {
        this._documentQuery._whereGreaterThanOrEqual(fieldName, value);
        return this;
    }

    public lessThan(fieldName: string, value: any): IFilterFactory<T> {
        this._documentQuery._whereLessThan(fieldName, value);
        return this;
    }

    public lessThanOrEqual(fieldName: string, value: any): IFilterFactory<T> {
        this._documentQuery._whereLessThanOrEqual(fieldName, value);
        return this;
    }

    public andAlso(): IFilterFactory<T> {
        this._documentQuery._andAlso();
        return this;
    }

    public orElse(): IFilterFactory<T> {
        this._documentQuery._orElse();
        return this;
    }

    public not(): IFilterFactory<T> {
        this._documentQuery._negateNext();
        return this;
    }

    public openSubclause(): IFilterFactory<T> {
        this._documentQuery._openSubclause();
        return this;
    }

    public closeSubclause(): IFilterFactory<T> {
        this._documentQuery._closeSubclause();
        return this;
    }

    private _setFilterLimit(limit: number) {
        (this._documentQuery as DocumentQuery<T>)._addFilterLimit(limit);
    }
}
