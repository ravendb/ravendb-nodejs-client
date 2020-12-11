import { RangeBuilder } from "./RangeBuilder";
import { IFacetOperations } from "./IFacetOperations";
import { Field } from "../../../Types";

export interface IFacetBuilder<T> {
    byRanges(range: RangeBuilder<any>, ...ranges: RangeBuilder<any>[]): IFacetOperations<T>;

    byField(fieldName: Field<T>): IFacetOperations<T>;

    allResults(): IFacetOperations<T>;

    // TBD IFacetOperations<T> ByField(Expression<Func<T, object>> path);
    // TBD IFacetOperations<T> ByRanges(Expression<Func<T, bool>> path, params Expression<Func<T, bool>>[] paths);
}
