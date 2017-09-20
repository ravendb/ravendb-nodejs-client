import {SpatialCriteria} from "./SpatialCriteria";
import {SpatialRelation} from "./SpatialRelation";
import {ShapeToken} from "../Tokens/ShapeToken";

export class WktCriteria extends SpatialCriteria {
  protected shapeWkt: string;

  constructor(shapeWkt: string, relation: SpatialRelation, distanceErrorPct: number) {
    super(relation, distanceErrorPct);
    this.shapeWkt = shapeWkt;
  }

  public getShapeToken(addQueryParameter: (parameterValue: (string | number)) => string): ShapeToken {
    return ShapeToken.wkt(addQueryParameter(this.shapeWkt));
  }
}