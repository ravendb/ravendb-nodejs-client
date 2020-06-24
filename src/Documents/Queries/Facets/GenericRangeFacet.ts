import { FacetBase } from "./FacetBase";
import { RangeBuilder } from "./RangeBuilder";
import { FacetToken } from "../../Session/Tokens/FacetToken";

export class GenericRangeFacet extends FacetBase {

    private readonly _parent: FacetBase;
    public ranges: RangeBuilder<any>[] = [];

    public constructor(parent?: FacetBase) {
        super();
        this._parent = parent;
    }

    public static parse(rangeBuilder: RangeBuilder<any>, addQueryParameter: (o: any) => string): string {
        return rangeBuilder.getStringRepresentation(addQueryParameter);
    }

    public toFacetToken(addQueryParameter: (o: any) => string) {
        if (this._parent) {
            return this._parent.toFacetToken(addQueryParameter);
        }
        return FacetToken.create(this, addQueryParameter);
    }
}
