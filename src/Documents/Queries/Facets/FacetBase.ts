import { FacetOptions, FacetAggregation } from ".";
import { FacetToken } from "../../Session/Tokens/FacetToken";

export abstract class FacetBase {
    
    private _displayFieldName: string;

    private _options: FacetOptions;
    
    private _aggregations: Map<FacetAggregation, string>;

    public constructor() {
        this._aggregations = new Map();
    }
     public get displayFieldName(): string {
        return this._displayFieldName;
    }
     public set displayFieldName(displayFieldName: string) {
        this._displayFieldName = displayFieldName;
    }
     public get options(): FacetOptions {
        return this._options;
    }
     public set options(options: FacetOptions) {
        this.options = options;
    }
     public get aggregations(): Map<FacetAggregation, string> {
        return this._aggregations;
    }
     public set aggregations(aggregations: Map<FacetAggregation, string>) {
        this._aggregations = aggregations;
    }

    public abstract toFacetToken(addQueryParameter: (o: object) => string): FacetToken;
}
