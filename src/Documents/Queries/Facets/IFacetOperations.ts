import { FacetOptions } from ".";
import { Field } from "../../../Types";

export interface IFacetOperations<T> {
    withDisplayName(displayName: string): IFacetOperations<T>;

    withOptions(options: FacetOptions): IFacetOperations<T>;

    sumOn(path: Field<T>): IFacetOperations<T>;
    sumOn(path: Field<T>, displayName: string): IFacetOperations<T>;

    minOn(path: Field<T>): IFacetOperations<T>;
    minOn(path: Field<T>, displayName: string): IFacetOperations<T>;

    maxOn(path: Field<T>): IFacetOperations<T>;
    maxOn(path: Field<T>, displayName: string): IFacetOperations<T>;

    averageOn(path: Field<T>): IFacetOperations<T>;
    averageOn(path: Field<T>, displayName: string): IFacetOperations<T>;
    //TBD overloads with expression
}
