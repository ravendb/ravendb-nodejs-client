import {FacetBase} from "./FacetBase";
import {FacetToken} from "../../Session/Tokens/FacetToken";

export class Facet extends FacetBase {

    public fieldName: string;

    public toFacetToken(addQueryParameter: (o: any) => string): FacetToken {
        return FacetToken.create(this, addQueryParameter);
    }
}
