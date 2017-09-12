import {SpartialCriteria} from "./SpartialCriteria";
import {SpartialRelation} from "./SpartialRelation";
import {ShapeToken} from "../Tokens/ShapeToken";

export class WktCriteria extends SpartialCriteria {
  protected shapeWkt: string;

  constructor(shapeWkt: string, relation: SpartialRelation, distanceErrorPct: number) {
    super(relation, distanceErrorPct);
    this.shapeWkt = shapeWkt;
  }

  public getShapeToken(addQueryParameter: (parameterValue: (string | number)) => string): ShapeToken {
    return ShapeToken.wkt(addQueryParameter(this.shapeWkt));
  }
}