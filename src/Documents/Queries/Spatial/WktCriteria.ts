import { SpatialCriteria } from "./SpatialCriteria";
import { SpatialRelation } from "../../Indexes/Spatial";
import { ShapeToken } from "../../Session/Tokens/ShapeToken";

export class WktCriteria extends SpatialCriteria {
    private readonly _shapeWkt: string;

    public constructor(shapeWkt: string, relation: SpatialRelation, distanceErrorPct: number) {
        super(relation, distanceErrorPct);
        this._shapeWkt = shapeWkt;
    }

    protected _getShapeToken(addQueryParameter: (o: any) => string): ShapeToken  {
        return ShapeToken.wkt(addQueryParameter(this._shapeWkt));
    }
}
