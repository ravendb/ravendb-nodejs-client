import { FacetResultObject } from "./AggregationQueryBase.js";
import { FacetBase } from "./FacetBase.js";
import { IFacetBuilder } from "./IFacetBuilder.js";
import { Lazy } from "../../Lazy.js";

export interface IAggregationDocumentQuery<T> {
    andAggregateBy(builder: (facetBuilder: IFacetBuilder<T>) => void): IAggregationDocumentQuery<T>;

    andAggregateBy(facet: FacetBase): IAggregationDocumentQuery<T>;

    execute(): Promise<FacetResultObject>;

    executeLazy(onEval?: (result: FacetResultObject) => void): Lazy<FacetResultObject>;
}
