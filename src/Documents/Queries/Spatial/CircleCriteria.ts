import {SpatialCriteria} from "./SpatialCriteria";
import {SpatialUnits, SpatialRelation} from "../../Indexes/Spatial";
import {ShapeToken} from "../../Session/Tokens/ShapeToken";

export class CircleCriteria extends SpatialCriteria {

    private readonly _radius: number;
    private readonly _latitude: number;
    private readonly _longitude: number;
    private readonly _radiusUnits: SpatialUnits;

    public constructor(
        radius: number,
        latitude: number,
        longitude: number,
        radiusUnits: SpatialUnits,
        relation: SpatialRelation,
        distErrorPercent: number) {
        super(relation, distErrorPercent);

        this._radius = radius;
        this._latitude = latitude;
        this._longitude = longitude;
        this._radiusUnits = radiusUnits;
    }

    protected _getShapeToken(addQueryParameter: (val: any) => string): ShapeToken {
        return ShapeToken.circle(
            addQueryParameter(this._radius),
            addQueryParameter(this._latitude),
            addQueryParameter(this._longitude),
            this._radiusUnits);
    }
}
