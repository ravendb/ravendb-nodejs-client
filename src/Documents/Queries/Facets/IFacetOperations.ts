import { FacetOptions } from ".";

export interface IFacetOperations<T> {
    withDisplayName(displayName: string): IFacetOperations<T>;

    withOptions(options: FacetOptions): IFacetOperations<T>;

    sumOn(path: string): IFacetOperations<T>;

    minOn(path: string): IFacetOperations<T>;

    maxOn(path: string): IFacetOperations<T>;

    averageOn(path: string): IFacetOperations<T>;

    //TBD overloads with expression
}
