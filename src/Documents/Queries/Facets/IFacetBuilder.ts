import { RangeBuilder } from "./RangeBuilder";
import { IFacetOperations } from "./IFacetOperations";

export interface IFacetBuilder<T> {
     byRanges(range: RangeBuilder<any>, ...ranges: Array<RangeBuilder<any>>): IFacetOperations<T>;
     byField(fieldName: string): IFacetOperations<T>;
     allResults(): IFacetOperations<T>;
     // TBD IFacetOperations<T> ByField(Expression<Func<T, object>> path);
     // TBD IFacetOperations<T> ByRanges(Expression<Func<T, bool>> path, params Expression<Func<T, bool>>[] paths);
}
