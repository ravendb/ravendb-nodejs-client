import { FacetResultObject } from "./AggregationQueryBase";
import { FacetBase } from "./FacetBase";
import { IFacetBuilder } from "./IFacetBuilder";
import { Lazy } from "../../Lazy";

export interface IAggregationDocumentQuery<T> {
    andAggregateBy(builder: (facetBuilder: IFacetBuilder<T>) => void): IAggregationDocumentQuery<T>;

    andAggregateBy(facet: FacetBase): IAggregationDocumentQuery<T>;

    execute(): Promise<FacetResultObject>;

    executeLazy(): Lazy<FacetResultObject>;
}
