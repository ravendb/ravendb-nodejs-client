import { FacetOptions, FacetAggregation } from ".";
import { FacetToken } from "../../Session/Tokens/FacetToken";

export abstract class FacetBase {

    public displayFieldName: string;

    public options: FacetOptions;

    public aggregations: Map<FacetAggregation, string> = new Map();

    public abstract toFacetToken(addQueryParameter: (o: any) => string): FacetToken;
}
