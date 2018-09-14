import { FacetBase } from "./FacetBase";
import { FacetToken } from "../../Session/Tokens/FacetToken"; 

export class RangeFacet extends FacetBase {

    private _parent: FacetBase;

    private _ranges: string[];

    public constructor(parent?: FacetBase) {
        super();
        this._ranges = [];
        this._parent = parent;
    }

    public get ranges(): string[] {
        return this._ranges;
    }

    public set ranges(ranges: string[]) {
        this._ranges = ranges;
    }

    public toFacetToken(addQueryParameter: (o: any) => string): FacetToken {
        if (this._parent) {
            return this._parent.toFacetToken(addQueryParameter);
        }

        return FacetToken.create(this, addQueryParameter);
    }
}
