import { FacetResult } from ".";
import { FacetResultObject } from "./AggregationQueryBase";
import { FacetBase } from "./FacetBase";
import { IFacetBuilder } from "./IFacetBuilder";

export interface IAggregationDocumentQuery<T> {
     andAggregateBy(builder: (facetBuilder: IFacetBuilder<T>) => void): IAggregationDocumentQuery<T>;
     andAggregateBy(facet: FacetBase): IAggregationDocumentQuery<T>;
     execute(): Promise<FacetResultObject>;
     // TBD Lazy<Dictionary<string, FacetResult>> ExecuteLazy(Action<Dictionary<string, FacetResult>> onEval = null);
}
