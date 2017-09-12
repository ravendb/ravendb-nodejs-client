import {SpartialCriteria} from "./SpartialCriteria";
import {SpartialUnit, SpartialUnits} from "./SpartialUnit";
import {SpartialRelation} from "./SpartialRelation";
import {ShapeToken} from "../Tokens/ShapeToken";

export class CircleCriteria extends SpartialCriteria {
  protected radius: number;
  protected latitude: number;
  protected longitude: number;
  protected radiusUnits: SpartialUnit;

  constructor(radius: number, latitude: number, longitude: number, radiusUnits: SpartialUnit = SpartialUnits.Kilometers,
    relation: SpartialRelation, distErrorPercent: number
  ) {
    super(relation, distErrorPercent);
    this.radius = radius;
    this.latitude = latitude;
    this.longitude = longitude;
    this.radiusUnits = radiusUnits || SpartialUnits.Kilometers;
  }

  public getShapeToken(addQueryParameter: (parameterValue: (string | number)) => string): ShapeToken {
    return ShapeToken.circle(
      addQueryParameter(this.radius), addQueryParameter(this.latitude),
      addQueryParameter(this.longitude), this.radiusUnits
    );
  }
}