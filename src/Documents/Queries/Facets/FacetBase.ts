import { FacetOptions, FacetAggregation } from ".";
import { FacetToken } from "../../Session/Tokens/FacetToken";
import { FacetAggregationField } from "./FacetAggregationField";

export abstract class FacetBase {

    public displayFieldName: string;

    public options: FacetOptions;

    public aggregations: Map<FacetAggregation, Set<FacetAggregationField>> = new Map();

    public abstract toFacetToken(addQueryParameter: (o: any) => string): FacetToken;
}
