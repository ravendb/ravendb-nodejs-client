import { FacetBase } from "./FacetBase";
import { FacetToken } from "../../Session/Tokens/FacetToken";

export class Facet extends FacetBase {

    private _fieldName: string;

    public get fieldName(): string {
        return this._fieldName;
    }

    public set fieldName(fieldName: string) {
        this._fieldName = fieldName;
    }

    public toFacetToken(addQueryParameter: (o: object) => string): FacetToken {
        return FacetToken.create(this, addQueryParameter);
    }
}
