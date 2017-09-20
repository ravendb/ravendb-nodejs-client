import {SpatialCriteria} from "./SpatialCriteria";
import {SpatialUnit, SpatialUnits} from "./SpatialUnit";
import {SpatialRelation} from "./SpatialRelation";
import {ShapeToken} from "../Tokens/ShapeToken";

export class CircleCriteria extends SpatialCriteria {
  protected radius: number;
  protected latitude: number;
  protected longitude: number;
  protected radiusUnits: SpatialUnit;

  constructor(radius: number, latitude: number, longitude: number, radiusUnits: SpatialUnit = SpatialUnits.Kilometers,
    relation: SpatialRelation, distErrorPercent: number
  ) {
    super(relation, distErrorPercent);
    this.radius = radius;
    this.latitude = latitude;
    this.longitude = longitude;
    this.radiusUnits = radiusUnits || SpatialUnits.Kilometers;
  }

  public getShapeToken(addQueryParameter: (parameterValue: (string | number)) => string): ShapeToken {
    return ShapeToken.circle(
      addQueryParameter(this.radius), addQueryParameter(this.latitude),
      addQueryParameter(this.longitude), this.radiusUnits
    );
  }
}