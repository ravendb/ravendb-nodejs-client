import { FacetBase } from "./FacetBase";
import { RangeBuilder } from "./RangeBuilder";
import { FacetToken } from "../../Session/Tokens/FacetToken"; 

export class GenericRangeFacet extends FacetBase {

     private _parent: FacetBase;
     private _ranges;

    public constructor(parent?: FacetBase) {
        super();
        this._ranges = [];
        this._parent = parent;
    }

    public static parse(rangeBuilder: RangeBuilder<any>, addQueryParameter: (o: any) => string): string {
        return rangeBuilder.getStringRepresentation(addQueryParameter);
    }

    public get ranges(): Array<RangeBuilder<any>> {
        return this._ranges;
    }

    public set ranges(ranges: Array<RangeBuilder<any>>) {
        this._ranges = ranges;
    }

    public toFacetToken(addQueryParameter: (o: any) => string) {
        if (this._parent) {
            return this._parent.toFacetToken(addQueryParameter);
        }
        return FacetToken.create(this, addQueryParameter);
    }
}
